"""Verify GitHub OAuth client credentials without authorizing a user."""
import json
import os
import urllib.request


def check_credentials(env, request=urllib.request.urlopen):
    client_id = env.get('GITHUB_CLIENT_ID')
    secret = env.get('GITHUB_CLIENT_SECRET')
    origin = env.get('PUBLIC_ORIGIN')
    if not client_id or not secret or not origin:
        raise ValueError('OAuth client credentials and PUBLIC_ORIGIN are required')
    body = json.dumps({'client_id': client_id, 'client_secret': secret,
                       'redirect_uri': origin.rstrip('/') + '/',
                       'code': 'fora-credential-check-not-an-authorization-code'}).encode()
    req = urllib.request.Request('https://github.com/login/oauth/access_token', data=body,
                                 headers={'Accept': 'application/json', 'Content-Type': 'application/json',
                                          'User-Agent': 'Fora'})
    with request(req, timeout=20) as response:
        result = json.load(response)
    if result.get('error') != 'bad_verification_code':
        reason = result.get('error')
        if reason not in {'incorrect_client_credentials', 'redirect_uri_mismatch'}:
            reason = 'unexpected_response'
        raise ValueError('GitHub credential check failed: ' + reason)


if __name__ == '__main__':
    check_credentials(os.environ)
    print('PASS GitHub accepted the app credentials; real user authorization still needs end-to-end verification')
