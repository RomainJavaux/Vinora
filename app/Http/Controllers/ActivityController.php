<?php

namespace App\Http\Controllers;

use App\Http\Resources\MovementResource;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ActivityController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $movements = $this->household($request)
            ->movements()
            ->with(['user', 'fromCompartment', 'toCompartment'])
            ->latest('created_at')
            ->latest('id')
            ->limit(150)
            ->get();

        return Inertia::render('activity', [
            'movements' => MovementResource::collection($movements)->resolve($request),
        ]);
    }
}
