<?php

use App\Http\Controllers\AccessController;
use App\Http\Controllers\EntityController;
use App\Http\Controllers\PeopleController;
use App\Http\Middleware\ResolveViewer;
use Illuminate\Support\Facades\Route;

Route::middleware(ResolveViewer::class)->group(function () {
    Route::get('me', [AccessController::class, 'me']);

    // Roles + permissions (were Base44 User.role and the Permission entity / savePermissions function).
    Route::get('roles', [AccessController::class, 'roles']);
    Route::put('roles', [AccessController::class, 'setRole']);
    Route::get('entities/Permission', [AccessController::class, 'permissions']);
    Route::post('functions/savePermissions', [AccessController::class, 'savePermissions']);

    // People come from the existing staff tables.
    Route::get('entities/Employee', [PeopleController::class, 'employees']);
    Route::get('entities/Employee/{id}', [PeopleController::class, 'employee']);
    Route::get('entities/Department', [PeopleController::class, 'departments']);
    Route::get('entities/Department/{id}', [PeopleController::class, 'department']);
    Route::put('entities/Department/{id}', [PeopleController::class, 'updateDepartment']);

    // Everything else: generic CRUD over the cc_* tables.
    Route::prefix('entities/{entity}')->controller(EntityController::class)->group(function () {
        Route::get('/', 'index');
        Route::post('/', 'store');
        Route::post('bulk', 'bulkStore');
        Route::put('bulk', 'bulkUpdate');
        Route::post('update-many', 'updateMany');
        Route::get('{id}', 'show');
        Route::put('{id}', 'update');
        Route::delete('{id}', 'destroy');
    });
});
