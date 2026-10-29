<?php

namespace App\Auth;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Who is making this request, according to Cloudflare Access. Ported from reporting's
 * src/Auth/Identity.php — see that file for the full reasoning.
 *
 * Only the signed Cf-Access-Jwt-Assertion is trusted, never the plain email header. Signature,
 * issuer, audience (a list: CF_ACCESS_AUD) and expiry are all checked. A missing or bad assertion
 * resolves to null; the caller turns that into a 401.
 *
 * With CF_ACCESS_* unset (local dev) DEV_USER_EMAIL stands in. That branch is unreachable once
 * Access is configured, so it can't be used to forge an identity in production.
 */
class CloudflareAccess
{
    private const JWKS_TTL = 3600;

    private const LEEWAY = 60;

    public function isConfigured(): bool
    {
        return config('compliance.access.team_domain') && config('compliance.access.aud');
    }

    /** @return array{email: string, name: ?string}|null */
    public function identify(Request $request): ?array
    {
        if (! $this->isConfigured()) {
            $dev = config('compliance.access.dev_user_email');

            return $dev ? ['email' => strtolower(trim($dev)), 'name' => null] : null;
        }

        $assertion = $request->header('Cf-Access-Jwt-Assertion');
        if (! $assertion) {
            return null;
        }

        try {
            $claims = $this->verify($assertion);
        } catch (\Throwable $e) {
            Log::warning('Access assertion rejected: '.$e->getMessage());

            return null;
        }

        $email = is_string($claims['email'] ?? null) ? strtolower(trim($claims['email'])) : '';
        if ($email === '') {
            return null;
        }
        $name = $claims['name'] ?? $claims['given_name'] ?? null;

        return ['email' => $email, 'name' => is_string($name) && trim($name) !== '' ? trim($name) : null];
    }

    private function verify(string $assertion): array
    {
        JWT::$leeway = self::LEEWAY;
        $claims = json_decode(json_encode(JWT::decode($assertion, $this->jwks())) ?: '{}', true);

        if (($claims['iss'] ?? null) !== 'https://'.config('compliance.access.team_domain')) {
            throw new \RuntimeException('issuer mismatch');
        }

        $aud = $claims['aud'] ?? null;
        $audiences = array_filter(is_array($aud) ? $aud : [$aud], 'is_string');
        if (array_intersect($audiences, config('compliance.access.aud')) === []) {
            throw new \RuntimeException('audience mismatch');
        }

        return $claims;
    }

    private function jwks(): array
    {
        $raw = Cache::remember('cf-access-jwks', self::JWKS_TTL, function () {
            $res = Http::timeout(5)->get('https://'.config('compliance.access.team_domain').'/cdn-cgi/access/certs');
            if (! $res->ok() || ! is_array($res->json('keys'))) {
                throw new \RuntimeException('JWKS fetch failed ('.$res->status().')');
            }

            return $res->json();
        });

        return JWK::parseKeySet($raw, 'RS256');
    }
}
