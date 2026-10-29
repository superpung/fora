"""Check preflight classification without exposing provider secrets."""
import io
import json
import unittest
from check_oauth import check_credentials


class CredentialChecks(unittest.TestCase):
    def test_only_invalid_code_after_accepted_credentials_passes(self):
        env = {'GITHUB_CLIENT_ID': 'client', 'GITHUB_CLIENT_SECRET': 'secret', 'PUBLIC_ORIGIN': 'https://fora.test'}
        def response(error):
            return lambda *args, **kwargs: io.BytesIO(json.dumps({'error': error}).encode())
        check_credentials(env, response('bad_verification_code'))
        for error in ['incorrect_client_credentials', 'redirect_uri_mismatch', 'secret-provider-message']:
            with self.assertRaises(ValueError) as caught:
                check_credentials(env, response(error))
            self.assertNotIn('secret-provider-message', str(caught.exception))
        with self.assertRaises(ValueError):
            check_credentials({})
