<?php

use App\Http\Controllers\Api\LegacyApiController;
use Illuminate\Support\Facades\Route;

Route::get('/health', [LegacyApiController::class, 'health']);

Route::get('/company_overview/{companyId}', [LegacyApiController::class, 'companyOverview']);
Route::get('/company_exceptions/{companyId}', [LegacyApiController::class, 'companyExceptions']);
Route::get('/company_audit/{companyId}', [LegacyApiController::class, 'companyAudit']);
Route::get('/company_period_status/{companyId}', [LegacyApiController::class, 'companyPeriodStatus']);

Route::post('/rpc/{name}', [LegacyApiController::class, 'rpc']);

Route::get('/{resource}', [LegacyApiController::class, 'index'])->where('resource', '[a-z_]+');
Route::post('/{resource}', [LegacyApiController::class, 'store'])->where('resource', '[a-z_]+');
Route::get('/{resource}/{recordId}', [LegacyApiController::class, 'show'])->where('resource', '[a-z_]+');
Route::put('/{resource}/{recordId}', [LegacyApiController::class, 'update'])->where('resource', '[a-z_]+');
Route::delete('/{resource}/{recordId}', [LegacyApiController::class, 'destroy'])->where('resource', '[a-z_]+');
