<?php

return [

    /*
    | Existing tables this app reads (never writes). Column names are configurable because they
    | live outside this repo — confirm them against the dev database.
    */
    'people' => [
        'connection' => env('PEOPLE_DB_CONNECTION', 'narrative'),
        'employees_table' => env('PEOPLE_EMPLOYEES_TABLE', 'tab_employees'),
        'email_column' => env('PEOPLE_EMAIL_COLUMN', 'email'),
        'departments_table' => env('PEOPLE_DEPARTMENTS_TABLE', 'tab_departments'),
        'department_name_column' => env('PEOPLE_DEPARTMENT_NAME_COLUMN', 'name'),
    ],

    'documents' => [
        'connection' => env('DOC_STORE_DB_CONNECTION', 'narrative-qldb'),
        'table' => 'doc_store',
        's3_prefix' => 'compliance',
    ],

    /*
    | Cloudflare Access. Either unset = local dev, where DEV_USER_EMAIL stands in (and is ignored
    | whenever Access is configured, so it can never forge an identity in production).
    | CF_ACCESS_AUD may be a comma-separated list.
    */
    'access' => [
        'team_domain' => env('CF_ACCESS_TEAM_DOMAIN'),
        'aud' => array_filter(array_map('trim', explode(',', (string) env('CF_ACCESS_AUD', '')))),
        'dev_user_email' => env('DEV_USER_EMAIL'),
    ],

    // Seeded as the first admin; everyone else is granted from the Permissions page.
    'first_admin' => env('COMPLIANCE_FIRST_ADMIN', 'mg@tabhq.com'),

    // Non-production: every outgoing email goes here instead (original recipients listed in the body).
    'mail_redirect_to' => env('MAIL_REDIRECT_TO'),

    'roles' => ['admin', 'risk_team', 'department_head', 'read_only'],

    // From frontend/src/lib/sections.js.
    'sections' => [
        'Dashboard', 'My Work', 'Risk Register', 'Project & Change', 'Departments', 'Controls',
        'KRI Dashboard', 'Actions Tracker', 'Incidents & Loss', 'Conflicts of Interest',
        'Gifts & Hospitality', 'Emerging Risks', 'Appetite', 'Policy Suite', 'Policy Report',
        'Insurance', 'Insurance Report', 'Third-Party', 'Meetings', 'Committees', 'Board Actions',
        'My Board Actions', 'Attendance Report', 'ERC Pack', 'Attestations', 'Attestation Report',
        'My Attestations', 'Audit Trail', 'Employees', 'Reports', 'Permissions', 'Administration',
    ],
    'always_granted_sections' => ['My Attestations'],
    'admin_only_sections' => ['Permissions', 'Administration'],
];
