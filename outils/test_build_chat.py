import importlib.util
import pathlib
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parents[1]
BUILD = HERE / 'outils/build.py'
spec = importlib.util.spec_from_file_location('build_chat_test', BUILD)
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)

class ChatBuildTest(unittest.TestCase):
    def test_public_injection_exactly_once_and_no_other_change(self):
        source = '<html><head></head><body><script src="/assets/rdv.js?v=3"></script>Bonjour</body></html>'
        patched = build.patch_chat(source, 'index.html')
        self.assertEqual(patched, source.replace('</body>', build.CHAT + '\n</body>'))
        self.assertEqual(build.patch_chat(patched, 'index.html'), patched)
        self.assertEqual(patched.count(build.CHAT), 1)

    def test_existing_tag_is_unchanged(self):
        source = '<body>' + build.CHAT + '\n</body>'
        self.assertEqual(build.patch_chat(source, 'conseils-vendeurs/essai/index.html'), source)

    def test_private_pages_remove_tag(self):
        source = '<body><p>Privé</p>' + build.CHAT + '\n</body>'
        for path in ['admin/index.html', 'admin/promesses/index.html', 'mon-espace/index.html']:
            with self.subTest(path=path):
                self.assertEqual(build.patch_chat(source, path), '<body><p>Privé</p></body>')

    def test_fragment_without_body_remains_untouched(self):
        source = '<div>Fragment sans page</div>'
        self.assertEqual(build.patch_chat(source, 'fragment.html'), source)

    def test_real_homepage_only_gets_chat(self):
        source = (HERE / 'index.html').read_text()
        source = source.replace(build.CHAT + '\n', '').replace(build.CHAT, '')
        patched = build.patch_chat(source, 'index.html')
        self.assertEqual(patched.replace(build.CHAT + '\n', '', 1), source)
        self.assertEqual(patched.count(build.CHAT), 1)

    def test_standard_build_uses_same_injection(self):
        source = '<html><head></head><body>Bonjour</body></html>'
        self.assertIn(build.CHAT, build.patch(source, 'index.html'))
        self.assertNotIn(build.CHAT, build.patch(source + build.CHAT, 'admin/index.html'))

    def test_chat_only_cli_has_no_other_build_effects(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            (root / 'outils').mkdir()
            shutil.copyfile(BUILD, root / 'outils/build.py')
            (root / 'admin').mkdir()
            (root / 'conseils').mkdir()
            (root / 'de-claude').mkdir()
            (root / '.wrangler').mkdir()
            (root / 'assets/chat').mkdir(parents=True)
            (root / 'assets/chat/chat.js').write_text('/* local fixture only */')
            public = '<html><head></head><body>Public</body></html>'
            (root / 'index.html').write_text(public)
            (root / 'admin/index.html').write_text('<body>Privé' + build.CHAT + '\n</body>')
            (root / 'outils/internal.html').write_text('<body>Interne</body>')
            (root / 'conseils/feed.xml').write_text('RSS PRESERVE')
            (root / 'de-claude/internal.html').write_text('<body>Interne Claude</body>')
            (root / '.wrangler/internal.html').write_text('<body>Interne Wrangler</body>')
            subprocess.run(['git', 'init', '-q'], cwd=root, check=True)
            subprocess.run(['git', 'add', '.'], cwd=root, check=True)
            (root / '.git/internal.html').write_text('<body>Interne Git</body>')
            (root / 'untracked.html').write_text('<body>Non suivi</body>')
            result = subprocess.run([sys.executable, 'outils/build.py', '--chat-only'], cwd=root, check=True, text=True, capture_output=True)
            self.assertEqual((root / 'index.html').read_text(), build.patch_chat(public, 'index.html'))
            self.assertEqual((root / 'admin/index.html').read_text(), '<body>Privé</body>')
            self.assertEqual((root / 'outils/internal.html').read_text(), '<body>Interne</body>')
            self.assertEqual((root / 'untracked.html').read_text(), '<body>Non suivi</body>')
            self.assertEqual((root / 'de-claude/internal.html').read_text(), '<body>Interne Claude</body>')
            self.assertEqual((root / '.wrangler/internal.html').read_text(), '<body>Interne Wrangler</body>')
            self.assertEqual((root / '.git/internal.html').read_text(), '<body>Interne Git</body>')
            self.assertEqual((root / 'conseils/feed.xml').read_text(), 'RSS PRESERVE')
            before = {str(p.relative_to(root)): p.read_bytes() for p in root.rglob('*') if p.is_file() and '.git' not in p.parts}
            subprocess.run([sys.executable, 'outils/build.py', '--chat-only'], cwd=root, check=True, capture_output=True)
            after = {str(p.relative_to(root)): p.read_bytes() for p in root.rglob('*') if p.is_file() and '.git' not in p.parts}
            self.assertEqual(before, after)

class CloudflareBranchCommandTest(unittest.TestCase):
    COMMAND = 'if [ "$CF_PAGES_BRANCH" = "main" ]; then python3 outils/build.py --chat-only; fi'

    def test_old_preview_branch_is_not_built(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            (root / 'outils').mkdir()
            (root / 'outils/build.py').write_text("raise RuntimeError('Ancienne preview ne doit pas lancer le nouveau mode')")
            for branch in ['trial-media', 'ancienne-branche', '']:
                result = subprocess.run(['sh', '-c', self.COMMAND], cwd=root,
                    env={**os.environ, 'CF_PAGES_BRANCH': branch}, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)

    def test_main_runs_chat_only_argument(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = pathlib.Path(temporary)
            (root / 'outils').mkdir()
            (root / 'outils/build.py').write_text(
                "import sys\nfrom pathlib import Path\nassert sys.argv[1:] == ['--chat-only']\nPath('executed').write_text('chat-only')\n")
            result = subprocess.run(['sh', '-c', self.COMMAND], cwd=root,
                env={**os.environ, 'CF_PAGES_BRANCH': 'main'}, capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual((root / 'executed').read_text(), 'chat-only')

if __name__ == '__main__':
    unittest.main()
