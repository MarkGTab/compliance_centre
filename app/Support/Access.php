<?php

namespace App\Support;

/**
 * Who may see and change what. Ported from the old frontend's lib/permissions.js (sections) and
 * lib/access.js (roles), which Base44 only enforced in the browser — here it's the server's job.
 */
class Access
{
    /** Entity → the section that governs it (access.js ENTITY_SECTION, plus the entities it left out). */
    public const ENTITY_SECTION = [
        'Risk' => 'Risk Register',
        'Control' => 'Controls',
        'Action' => 'Actions Tracker',
        'KRI' => 'KRI Dashboard',
        'KRIReading' => 'KRI Dashboard',
        'Incident' => 'Incidents & Loss',
        'ConflictOfInterest' => 'Conflicts of Interest',
        'EmergingRisk' => 'Emerging Risks',
        'Department' => 'Departments',
        'Appetite' => 'Appetite',
        'RiskCategory' => 'Appetite',
        'Policy' => 'Policy Suite',
        'InsurancePolicy' => 'Insurance',
        'ThirdParty' => 'Third-Party',
        'GiftHospitalityDeclaration' => 'Gifts & Hospitality',
        'Meeting' => 'Meetings',
        'Decision' => 'Meetings',
        'Attendance' => 'Meetings',
        'DecisionRecusal' => 'Meetings',
        'Committee' => 'Committees',
        'StandingMember' => 'Committees',
        'BoardAction' => 'Board Actions',
        'AttestationCampaign' => 'Attestations',
        'AttestationResponse' => 'Attestations',
        'ReportDefinition' => 'Reports',
        'ChangeLog' => 'Audit Trail',
        'Employee' => 'Employees',
    ];

    /**
     * Personal data: readable in full only with the section's view permission. Without it a viewer
     * sees just the rows naming them in one of these fields (Base44 let every user read all of it).
     */
    public const RESTRICTED_READ = [
        'ConflictOfInterest' => ['raised_by'],
        'GiftHospitalityDeclaration' => ['employee', 'approver'],
        'AttestationResponse' => ['employee'],
        'DecisionRecusal' => ['employee'],
        'ChangeLog' => [],
    ];

    private const RISK_TEAM_ENTITIES = ['Risk', 'Control', 'Action', 'KRI', 'KRIReading', 'AttestationCampaign', 'AttestationResponse', 'ReportDefinition'];

    private const DEPT_SCOPED_ENTITIES = ['Risk', 'Control', 'Action'];

    /** Written by the server only (audit trail) or through dedicated endpoints. */
    private const SERVER_ONLY = ['ChangeLog'];

    public function __construct(private Viewer $viewer) {}

    public function canViewSection(string $section): bool
    {
        if (in_array($section, config('compliance.always_granted_sections'))) {
            return true;
        }
        if (in_array($section, config('compliance.admin_only_sections'))) {
            return $this->viewer->isAdmin();
        }

        return $this->viewer->isAdmin() || ($this->viewer->sectionPermissions()[$section]['can_view'] ?? false);
    }

    public function canEditSection(string $section): bool
    {
        if (in_array($section, config('compliance.always_granted_sections'))) {
            return true;
        }
        if (in_array($section, config('compliance.admin_only_sections'))) {
            return $this->viewer->isAdmin();
        }
        $p = $this->viewer->sectionPermissions()[$section] ?? null;

        return $this->viewer->isAdmin() || ($p && $p['can_view'] && $p['can_edit']);
    }

    /** Null = may read every row; otherwise the fields that must name the viewer ([] = nothing). */
    public function readScope(string $entity): ?array
    {
        if (! array_key_exists($entity, self::RESTRICTED_READ)) {
            return null;
        }
        $section = self::ENTITY_SECTION[$entity] ?? null;
        if ($section && $this->canViewSection($section)) {
            return null;
        }
        if ($entity === 'AttestationResponse' && $this->canViewSection('Attestation Report')) {
            return null;
        }

        return $this->viewer->employeeId() ? self::RESTRICTED_READ[$entity] : [];
    }

    public function canCreate(string $entity): bool
    {
        return $this->sectionAllowsEdit($entity) && $this->roleCanCreate($entity);
    }

    public function canUpdate(string $entity, ?string $recordDeptId): bool
    {
        return $this->sectionAllowsEdit($entity) && $this->roleCanEdit($entity, $recordDeptId);
    }

    public function canDelete(string $entity): bool
    {
        if (! $this->sectionAllowsEdit($entity)) {
            return false;
        }

        return $this->viewer->isAdmin()
            || ($this->viewer->role === 'risk_team' && in_array($entity, self::RISK_TEAM_ENTITIES));
    }

    private function sectionAllowsEdit(string $entity): bool
    {
        if (in_array($entity, self::SERVER_ONLY)) {
            return false;
        }
        $section = self::ENTITY_SECTION[$entity] ?? null;

        return ! $section || $this->canEditSection($section);
    }

    private function roleCanCreate(string $entity): bool
    {
        return match ($this->viewer->role) {
            'admin' => true,
            'risk_team' => in_array($entity, self::RISK_TEAM_ENTITIES),
            'department_head' => in_array($entity, self::DEPT_SCOPED_ENTITIES) || $entity === 'ReportDefinition',
            default => false,
        };
    }

    private function roleCanEdit(string $entity, ?string $recordDeptId): bool
    {
        return match ($this->viewer->role) {
            'admin' => true,
            'risk_team' => in_array($entity, self::RISK_TEAM_ENTITIES),
            'department_head' => $entity === 'ReportDefinition'
                || (in_array($entity, self::DEPT_SCOPED_ENTITIES)
                    && $recordDeptId !== null && $recordDeptId === $this->viewer->departmentId()),
            default => false,
        };
    }
}
