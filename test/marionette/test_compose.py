import gc
import json
import os
import shutil
import tempfile
import time
import unittest
import zipfile
from pathlib import Path

from marionette_driver.addons import Addons
from marionette_driver.marionette import Marionette

ROOT = Path(__file__).resolve().parents[2]
MANIFEST = json.loads((ROOT / "manifest.json").read_text())


class ComposeTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.artifacts = tempfile.TemporaryDirectory(prefix="thunderbird-compose-")
        cls.marionette = None
        try:
            xpi = Path(cls.artifacts.name) / "addon.xpi"
            with zipfile.ZipFile(xpi, "w") as archive:
                for name in ["manifest.json", *MANIFEST["background"]["scripts"]]:
                    archive.write(ROOT / name, name)
                for icon in (ROOT / "icons").glob("*"):
                    archive.write(icon, icon.relative_to(ROOT))
            binary = os.environ.get("THUNDERBIRD_BIN") or shutil.which("thunderbird")
            cls.marionette = Marionette(
                app="thunderbird",
                bin=binary or "/Applications/Thunderbird.app/Contents/MacOS/thunderbird",
                port=2829,
                app_args=["-no-remote", "-headless", "--remote-allow-system-access"],
                prefs={
                    "mail.provider.suppress_dialog_on_startup": True,
                    "mail.shell.checkDefaultClient": False,
                    "mailnews.start_page.enabled": False,
                    "datareporting.policy.dataSubmissionEnabled": False,
                    "mail.compose.default_to_paragraph": False,
                },
                gecko_log=str(Path(cls.artifacts.name) / "gecko.log"),
            )
            cls.marionette.start_session()
            cls.marionette.set_context("chrome")
            cls.chrome_handle = cls.marionette.current_chrome_window_handle
            profile = Path(cls.execute('return Services.dirsvc.get("ProfD", Ci.nsIFile).path;')).resolve()
            if profile != Path(cls.marionette.profile_path).resolve() or not profile.is_relative_to(Path(tempfile.gettempdir()).resolve()):
                raise AssertionError(f"Not a managed temporary profile: {profile}")
            cls.execute("""
                const { MailServices } = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs");
                MailServices.accounts.createLocalMailAccount();
                const server = MailServices.accounts.localFoldersServer;
                const account = MailServices.accounts.findAccountForServer(server);
                const identity = MailServices.accounts.createIdentity();
                identity.email = "recipient@addon.test";
                identity.fullName = "Add-on test";
                account.addIdentity(identity);
                const root = server.rootFolder.QueryInterface(Ci.nsIMsgLocalMailFolder);
                const source = root.createLocalSubfolder("Source");
                source.QueryInterface(Ci.nsIMsgLocalMailFolder);
                const header = source.addMessage([
                    "From - Fri Oct 02 12:00:00 2026",
                    "From: Sender <sender@addon.test>",
                    "To: Recipient <recipient@addon.test>",
                    "Date: Fri, 02 Oct 2026 12:00:00 +0000",
                    "Message-ID: <compose-fixture@addon.test>",
                    "Subject: AW: Project",
                    "Content-Type: text/plain; charset=UTF-8",
                    "", "Fixture body", ""
                ].join("\\r\\n"));
                window.__composeFixture = { source, header, identity };
                const tabmail = document.getElementById("tabmail");
                tabmail.switchToTab(tabmail.tabInfo.findIndex(tab => tab.mode.name === "mail3PaneTab"));
                tabmail.currentAbout3Pane.displayFolder(source.URI);
            """)
            cls.wait_for('return document.getElementById("tabmail").currentAbout3Pane.gFolder?.URI === window.__composeFixture.source.URI;')
            Addons(cls.marionette).install(str(xpi), temp=True)
        except Exception:
            cls.tearDownClass()
            raise

    @classmethod
    def tearDownClass(cls):
        if cls.marionette is not None:
            cls.marionette.cleanup()
            cls.marionette = None
            gc.collect()
        cls.artifacts.cleanup()

    @classmethod
    def execute(cls, script, *args):
        cls.marionette.set_context("chrome")
        cls.marionette.switch_to_window(cls.chrome_handle, focus=False)
        return cls.marionette.execute_script(script, script_args=list(args), sandbox="system")

    @classmethod
    def wait_for(cls, script, *args):
        deadline = time.monotonic() + 10
        while time.monotonic() < deadline:
            result = cls.execute(script, *args)
            if result:
                return result
            time.sleep(0.05)
        raise AssertionError(f"Timed out waiting for {script}")

    def tearDown(self):
        self.execute("""
            for (const compose of Services.wm.getEnumerator("msgcompose")) {
                compose.gContentChanged = false;
                compose.gMsgCompose.bodyModified = false;
                compose.close();
            }
        """)
        self.wait_for('return !Services.wm.getMostRecentWindow("msgcompose");')

    def open_compose(self, kind):
        self.execute("""
            const { MailServices } = ChromeUtils.importESModule("resource:///modules/MailServices.sys.mjs");
            const fixture = window.__composeFixture;
            const params = Cc["@mozilla.org/messengercompose/composeparams;1"].createInstance(Ci.nsIMsgComposeParams);
            params.type = Ci.nsIMsgCompType[arguments[0]];
            params.format = Ci.nsIMsgCompFormat.PlainText;
            params.identity = fixture.identity;
            params.composeFields = Cc["@mozilla.org/messengercompose/composefields;1"].createInstance(Ci.nsIMsgCompFields);
            if (arguments[0] === "New") {
                params.composeFields.subject = "Re: AW: Deliberate new subject";
            } else {
                params.originalMsgURI = fixture.source.getUriForMsg(fixture.header);
            }
            MailServices.compose.OpenComposeWindowWithParams(null, params);
        """, kind)
        self.wait_for('return Boolean(Services.wm.getMostRecentWindow("msgcompose")?.gMsgCompose?.editor?.document);')

    def subject(self):
        return self.execute('return Services.wm.getMostRecentWindow("msgcompose").document.getElementById("msgSubject").value;')

    def test_reply_unstacks_the_subject_in_the_real_compose_window(self):
        self.open_compose("Reply")
        self.wait_for('return Services.wm.getMostRecentWindow("msgcompose").document.getElementById("msgSubject").value === "AW: Project";')
        self.assertEqual(self.subject(), "AW: Project")

    def test_new_message_keeps_an_intentionally_stacked_subject(self):
        self.open_compose("New")
        self.assertEqual(self.subject(), "Re: AW: Deliberate new subject")

    def test_forward_keeps_its_forward_prefix(self):
        self.open_compose("ForwardInline")
        self.assertEqual(self.subject(), "Fwd: AW: Project")


if __name__ == "__main__":
    unittest.main(verbosity=2, warnings="ignore")
