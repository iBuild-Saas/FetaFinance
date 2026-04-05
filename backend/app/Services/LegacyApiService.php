<?php

namespace App\Services;

use App\Services\Concerns\BuildsLegacyReports;
use App\Services\Concerns\HandlesLegacyCrud;
use App\Services\Concerns\SeedsLegacyWorkspace;

class LegacyApiService
{
    use BuildsLegacyReports;
    use HandlesLegacyCrud;
    use SeedsLegacyWorkspace;

    private array $tableColumnsCache = [];

    private function getConfig(string $resource): ?array
    {
        return config("legacy_api.tables.{$resource}");
    }

    private function singularLabel(string $resource): string
    {
        return rtrim($resource, 's');
    }
}
