<?php

namespace App\Http\Middleware;

use App\Auth\CloudflareAccess;
use App\Support\Access;
use App\Support\Viewer;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Every /api route needs a Cloudflare Access identity. Binds the Viewer and its Access rules. */
class ResolveViewer
{
    public function __construct(private CloudflareAccess $access) {}

    public function handle(Request $request, Closure $next): Response
    {
        $identity = $this->access->identify($request);
        if (! $identity) {
            return response()->json(['error' => 'Not signed in'], 401);
        }

        $viewer = Viewer::resolve($identity['email'], $identity['name']);
        app()->instance(Viewer::class, $viewer);
        app()->instance(Access::class, new Access($viewer));

        return $next($request);
    }
}
