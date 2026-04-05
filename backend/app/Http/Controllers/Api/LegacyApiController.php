<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\LegacyApiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LegacyApiController extends Controller
{
    public function __construct(private readonly LegacyApiService $service)
    {
    }

    public function health(): JsonResponse
    {
        [$status, $payload] = $this->service->health();

        return response()->json($payload, $status);
    }

    public function index(Request $request, string $resource): JsonResponse
    {
        [$status, $payload] = $this->service->index($resource, $request->query());

        return response()->json($payload, $status);
    }

    public function show(string $resource, string $recordId): JsonResponse
    {
        [$status, $payload] = $this->service->show($resource, $recordId);

        return response()->json($payload, $status);
    }

    public function store(Request $request, string $resource): JsonResponse
    {
        [$status, $payload] = $this->service->store($resource, $request->all());

        return response()->json($payload, $status);
    }

    public function update(Request $request, string $resource, string $recordId): JsonResponse
    {
        [$status, $payload] = $this->service->update($resource, $recordId, $request->all());

        return response()->json($payload, $status);
    }

    public function destroy(string $resource, string $recordId): JsonResponse
    {
        [$status, $payload] = $this->service->destroy($resource, $recordId);

        return response()->json($payload, $status);
    }

    public function companyOverview(string $companyId): JsonResponse
    {
        return response()->json($this->service->buildCompanyOverview($companyId));
    }

    public function companyExceptions(string $companyId): JsonResponse
    {
        return response()->json($this->service->buildCompanyExceptions($companyId));
    }

    public function companyAudit(string $companyId): JsonResponse
    {
        return response()->json($this->service->buildCompanyAudit($companyId));
    }

    public function companyPeriodStatus(string $companyId): JsonResponse
    {
        return response()->json($this->service->buildCompanyPeriodStatus($companyId));
    }

    public function rpc(Request $request, string $name): JsonResponse
    {
        [$status, $payload] = $this->service->rpc($name, $request->all());

        return response()->json($payload, $status);
    }
}
