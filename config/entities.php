<?php

// Generated from legacy/base44/entities/*.jsonc. Field types:
// relation = id of another entity (Employee/Department ids are tab_employees / departments ids),
// email = a person's email (was a Base44 User reference), array/object = JSON.
// Edit by hand from here on; keep in step with the migrations.

return [
    'Action' => [
        'table' => 'cc_action',
        'fields' => [
            'bucket' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['30-day', '60-day', '90-day'],
            ],
            'description' => [
                'required' => true,
                'type' => 'text',
            ],
            'due_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'last_modified_by' => [
                'required' => false,
                'type' => 'email',
            ],
            'last_modified_date' => [
                'required' => false,
                'type' => 'datetime',
            ],
            'linked_risk' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Risk',
            ],
            'owner' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'priority' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['High', 'Medium', 'Low'],
            ],
            'status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Open', 'In Progress', 'Complete'],
            ],
        ],
    ],
    'Appetite' => [
        'table' => 'cc_appetite',
        'fields' => [
            'appetite_level' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Open', 'Cautious', 'Moderate', 'Averse', 'Zero'],
            ],
            'category' => [
                'required' => true,
                'type' => 'relation',
                'relation' => 'RiskCategory',
            ],
            'max_residual_score' => [
                'required' => false,
                'type' => 'integer',
                'min' => 1,
                'max' => 25,
            ],
            'metric' => [
                'required' => false,
                'type' => 'text',
            ],
            'qualitative_statement' => [
                'required' => false,
                'type' => 'text',
            ],
            'threshold' => [
                'required' => false,
                'type' => 'text',
            ],
            'tolerance_score' => [
                'required' => false,
                'type' => 'integer',
                'min' => 1,
                'max' => 25,
            ],
        ],
    ],
    'Attendance' => [
        'table' => 'cc_attendance',
        'fields' => [
            'attendance_status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Invited', 'Present', 'Apologies', 'Absent', 'Recused'],
            ],
            'invitee' => [
                'required' => true,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'linked_conflict' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'ConflictOfInterest',
            ],
            'meeting' => [
                'required' => true,
                'type' => 'relation',
                'relation' => 'Meeting',
            ],
            'recusal_reason' => [
                'required' => false,
                'type' => 'text',
            ],
            'role_at_meeting' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Chair', 'Member', 'Secretary', 'Attendee', 'Guest'],
            ],
        ],
    ],
    'AttestationCampaign' => [
        'table' => 'cc_attestation_campaign',
        'fields' => [
            'allow_exceptions' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Yes', 'No'],
            ],
            'audience' => [
                'required' => false,
                'type' => 'array',
                'relation' => 'Employee',
            ],
            'audience_departments' => [
                'required' => false,
                'type' => 'array',
                'relation' => 'Department',
            ],
            'audience_roles' => [
                'required' => false,
                'type' => 'array',
            ],
            'campaign_ref' => [
                'required' => false,
                'type' => 'string',
            ],
            'due_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'frequency' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['One-off', 'Monthly', 'Quarterly', 'Annual'],
            ],
            'issue_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'last_modified_by' => [
                'required' => false,
                'type' => 'email',
            ],
            'last_modified_date' => [
                'required' => false,
                'type' => 'datetime',
            ],
            'linked_control' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Control',
            ],
            'linked_policy' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Policy',
            ],
            'linked_risk' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Risk',
            ],
            'owner' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'statement' => [
                'required' => false,
                'type' => 'text',
            ],
            'status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Draft', 'Active', 'Closed'],
            ],
            'title' => [
                'required' => true,
                'type' => 'string',
            ],
            'type' => [
                'required' => true,
                'type' => 'enum',
                'values' => ['Policy Attestation', 'Conflicts of Interest Declaration', 'Gifts & Hospitality Nil Return', 'Code of Conduct', 'SMCR Conduct Rules', 'Fitness & Propriety', 'Control Owner Sign-off', 'Risk Owner Sign-off', 'Training Confirmation', 'Other'],
            ],
        ],
    ],
    'AttestationResponse' => [
        'table' => 'cc_attestation_response',
        'fields' => [
            'campaign' => [
                'required' => true,
                'type' => 'relation',
                'relation' => 'AttestationCampaign',
            ],
            'employee' => [
                'required' => true,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'exception_detail' => [
                'required' => false,
                'type' => 'text',
            ],
            'linked_action' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Action',
            ],
            'linked_conflict' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'ConflictOfInterest',
            ],
            'locked' => [
                'required' => false,
                'type' => 'boolean',
            ],
            'recipient_email' => [
                'required' => false,
                'type' => 'string',
            ],
            'response_ref' => [
                'required' => false,
                'type' => 'string',
            ],
            'response_type' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Confirmed', 'Confirmed with Exceptions', 'Declined'],
            ],
            'signature_name' => [
                'required' => false,
                'type' => 'string',
            ],
            'signed_datetime' => [
                'required' => false,
                'type' => 'datetime',
            ],
            'status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Pending', 'Completed', 'Exception Raised', 'Overdue'],
            ],
        ],
    ],
    'BoardAction' => [
        'table' => 'cc_board_action',
        'fields' => [
            'assignee' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'completed_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'description' => [
                'required' => true,
                'type' => 'text',
            ],
            'due_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'follow_up_notes' => [
                'required' => false,
                'type' => 'text',
            ],
            'linked_policy' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Policy',
            ],
            'linked_risk' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Risk',
            ],
            'meeting' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Meeting',
            ],
            'priority' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['High', 'Medium', 'Low'],
            ],
            'status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Open', 'In Progress', 'Complete', 'Overdue'],
            ],
        ],
    ],
    'ChangeLog' => [
        'table' => 'cc_change_log',
        'fields' => [
            'action' => [
                'required' => true,
                'type' => 'enum',
                'values' => ['created', 'updated', 'deleted'],
            ],
            'changes' => [
                'required' => false,
                'type' => 'text',
            ],
            'entity' => [
                'required' => true,
                'type' => 'enum',
                'values' => ['Risk', 'Control', 'Action', 'Incident', 'Meeting', 'Policy', 'InsurancePolicy', 'Decision', 'BoardAction', 'Appetite', 'ConflictOfInterest', 'ThirdParty', 'EmergingRisk', 'KRI', 'Department', 'RiskCategory', 'GiftHospitality', 'AttestationCampaign', 'AttestationResponse', 'Permission', 'Employee', 'Attendance', 'Committee', 'StandingMember', 'DecisionRecusal', 'GiftHospitalityDeclaration', 'KRIReading', 'ReportDefinition'],
            ],
            'record_id' => [
                'required' => false,
                'type' => 'string',
            ],
            'record_ref' => [
                'required' => false,
                'type' => 'string',
            ],
            'timestamp' => [
                'required' => false,
                'type' => 'datetime',
            ],
            'user' => [
                'required' => false,
                'type' => 'email',
            ],
            'user_name' => [
                'required' => false,
                'type' => 'string',
            ],
        ],
    ],
    'Committee' => [
        'table' => 'cc_committee',
        'fields' => [
            'description' => [
                'required' => false,
                'type' => 'text',
            ],
            'name' => [
                'required' => true,
                'type' => 'enum',
                'values' => ['Board', 'Board Risk Committee', 'ERC', 'Credit Committee', 'Other'],
            ],
            'quorum' => [
                'required' => false,
                'type' => 'integer',
                'min' => 0,
            ],
        ],
    ],
    'ConflictOfInterest' => [
        'table' => 'cc_conflict_of_interest',
        'fields' => [
            'date_identified' => [
                'required' => false,
                'type' => 'date',
            ],
            'mitigation' => [
                'required' => false,
                'type' => 'text',
            ],
            'nature_of_conflict' => [
                'required' => true,
                'type' => 'text',
            ],
            'person' => [
                'required' => true,
                'type' => 'string',
            ],
            'raised_by' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'related_parties' => [
                'required' => false,
                'type' => 'text',
            ],
            'review_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'source_attestation' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'AttestationResponse',
            ],
            'status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Under Review', 'Active', 'Mitigated', 'Closed'],
            ],
        ],
    ],
    'Control' => [
        'table' => 'cc_control',
        'fields' => [
            'control_ref' => [
                'required' => true,
                'type' => 'string',
            ],
            'department' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Department',
            ],
            'description' => [
                'required' => true,
                'type' => 'text',
            ],
            'design_effectiveness' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Strong', 'Adequate', 'Weak'],
            ],
            'evidence_link' => [
                'required' => false,
                'type' => 'url',
            ],
            'last_modified_by' => [
                'required' => false,
                'type' => 'email',
            ],
            'last_modified_date' => [
                'required' => false,
                'type' => 'datetime',
            ],
            'last_tested' => [
                'required' => false,
                'type' => 'date',
            ],
            'linked_risks' => [
                'required' => false,
                'type' => 'array',
                'relation' => 'Risk',
            ],
            'operating_effectiveness' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Strong', 'Adequate', 'Weak'],
            ],
            'owner' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'test_frequency' => [
                'required' => false,
                'type' => 'string',
            ],
            'type' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Preventive', 'Detective', 'Corrective'],
            ],
        ],
    ],
    'Decision' => [
        'table' => 'cc_decision',
        'fields' => [
            'decision_text' => [
                'required' => true,
                'type' => 'text',
            ],
            'decision_type' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Resolved', 'Noted', 'Approved', 'Deferred'],
            ],
            'meeting' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Meeting',
            ],
            'related_policy' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Policy',
            ],
            'related_risk' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Risk',
            ],
        ],
    ],
    'DecisionRecusal' => [
        'table' => 'cc_decision_recusal',
        'fields' => [
            'decision' => [
                'required' => true,
                'type' => 'relation',
                'relation' => 'Decision',
            ],
            'employee' => [
                'required' => true,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'linked_conflict' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'ConflictOfInterest',
            ],
            'reason' => [
                'required' => false,
                'type' => 'text',
            ],
        ],
    ],
    'EmergingRisk' => [
        'table' => 'cc_emerging_risk',
        'fields' => [
            'description' => [
                'required' => false,
                'type' => 'text',
            ],
            'likelihood_horizon' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['0-3 months', '3-6 months', '6-12 months', '12+ months'],
            ],
            'owner' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'potential_impact' => [
                'required' => false,
                'type' => 'text',
            ],
            'theme' => [
                'required' => true,
                'type' => 'string',
            ],
            'watch_status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Watching', 'Escalated', 'Monitoring', 'Closed'],
            ],
        ],
    ],
    'GiftHospitalityDeclaration' => [
        'table' => 'cc_gift_hospitality_declaration',
        'fields' => [
            'applicable_threshold' => [
                'required' => false,
                'type' => 'number',
            ],
            'approval_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'approver' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'compliance_status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Within Policy', 'Requires Review', 'BREACH'],
            ],
            'counterparty' => [
                'required' => false,
                'type' => 'string',
            ],
            'counterparty_relationship' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Client/Borrower', 'Broker/Introducer', 'Supplier/Vendor', 'Professional Adviser', 'Other'],
            ],
            'cumulative_flag' => [
                'required' => false,
                'type' => 'boolean',
            ],
            'cumulative_value' => [
                'required' => false,
                'type' => 'number',
            ],
            'date' => [
                'required' => false,
                'type' => 'date',
            ],
            'declaration_ref' => [
                'required' => true,
                'type' => 'string',
            ],
            'description' => [
                'required' => false,
                'type' => 'text',
            ],
            'direction' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Received', 'Given'],
            ],
            'employee' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'estimated_value' => [
                'required' => false,
                'type' => 'number',
            ],
            'governing_policy' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Policy',
            ],
            'governing_policy_name' => [
                'required' => false,
                'type' => 'string',
            ],
            'governing_policy_version' => [
                'required' => false,
                'type' => 'text',
            ],
            'last_modified_by' => [
                'required' => false,
                'type' => 'email',
            ],
            'last_modified_date' => [
                'required' => false,
                'type' => 'datetime',
            ],
            'linked_conflict' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'ConflictOfInterest',
            ],
            'mitigation_notes' => [
                'required' => false,
                'type' => 'text',
            ],
            'prior_approval_obtained' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Yes', 'No', 'N/A'],
            ],
            'prior_approval_required' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Yes', 'No'],
            ],
            'purpose' => [
                'required' => false,
                'type' => 'text',
            ],
            'status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Submitted', 'Under Review', 'Recorded', 'Declined'],
            ],
            'type' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Gift', 'Hospitality'],
            ],
        ],
    ],
    'Incident' => [
        'table' => 'cc_incident',
        'fields' => [
            'category' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'RiskCategory',
            ],
            'date' => [
                'required' => false,
                'type' => 'date',
            ],
            'description' => [
                'required' => true,
                'type' => 'text',
            ],
            'financial_impact' => [
                'required' => false,
                'type' => 'number',
            ],
            'incident_ref' => [
                'required' => true,
                'type' => 'string',
            ],
            'last_modified_by' => [
                'required' => false,
                'type' => 'email',
            ],
            'last_modified_date' => [
                'required' => false,
                'type' => 'datetime',
            ],
            'lessons_learned_status' => [
                'required' => false,
                'type' => 'text',
            ],
            'linked_risk' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Risk',
            ],
            'remediation_status' => [
                'required' => false,
                'type' => 'text',
            ],
            'root_cause' => [
                'required' => false,
                'type' => 'text',
            ],
        ],
    ],
    'InsurancePolicy' => [
        'table' => 'cc_insurance_policy',
        'fields' => [
            'broker' => [
                'required' => false,
                'type' => 'string',
            ],
            'cover_type' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['PI', 'D&O', 'Cyber', 'Buildings', 'Contents', 'Employers\' Liability', 'Public Liability', 'Key Person', 'Other'],
            ],
            'excess' => [
                'required' => false,
                'type' => 'number',
            ],
            'expiry_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'inception_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'insurer' => [
                'required' => false,
                'type' => 'string',
            ],
            'key_exclusions' => [
                'required' => false,
                'type' => 'text',
            ],
            'limit_of_indemnity' => [
                'required' => false,
                'type' => 'number',
            ],
            'linked_risks' => [
                'required' => false,
                'type' => 'array',
                'relation' => 'Risk',
            ],
            'owner' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'policy_name' => [
                'required' => true,
                'type' => 'string',
            ],
            'policy_number' => [
                'required' => false,
                'type' => 'string',
            ],
            'premium' => [
                'required' => false,
                'type' => 'number',
            ],
            'purpose' => [
                'required' => false,
                'type' => 'text',
            ],
            'renewal_frequency' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Annual', 'Other'],
            ],
            'status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Active', 'Due for Renewal', 'Lapsed', 'Archived'],
            ],
            'summary' => [
                'required' => false,
                'type' => 'text',
            ],
        ],
    ],
    'KRI' => [
        'table' => 'cc_kri',
        'fields' => [
            'amber_threshold' => [
                'required' => false,
                'type' => 'text',
            ],
            'amber_trigger' => [
                'required' => false,
                'type' => 'number',
            ],
            'current_value' => [
                'required' => false,
                'type' => 'text',
            ],
            'current_value_num' => [
                'required' => false,
                'type' => 'number',
            ],
            'data_source' => [
                'required' => false,
                'type' => 'string',
            ],
            'direction' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Higher is worse', 'Lower is worse'],
            ],
            'frequency' => [
                'required' => false,
                'type' => 'string',
            ],
            'green_threshold' => [
                'required' => false,
                'type' => 'text',
            ],
            'indicator' => [
                'required' => true,
                'type' => 'string',
            ],
            'last_updated' => [
                'required' => false,
                'type' => 'date',
            ],
            'linked_category' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'RiskCategory',
            ],
            'linked_risk' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Risk',
            ],
            'next_update_due' => [
                'required' => false,
                'type' => 'date',
            ],
            'owner' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'red_threshold' => [
                'required' => false,
                'type' => 'text',
            ],
            'red_trigger' => [
                'required' => false,
                'type' => 'number',
            ],
            'trend' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Improving', 'Stable', 'Worsening'],
            ],
            'unit' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['%', 'GBP', 'Count', 'Ratio', 'Days', 'Months', 'bps', 'Other'],
            ],
        ],
    ],
    'KRIReading' => [
        'table' => 'cc_kri_reading',
        'fields' => [
            'commentary' => [
                'required' => false,
                'type' => 'text',
            ],
            'kri' => [
                'required' => true,
                'type' => 'relation',
                'relation' => 'KRI',
            ],
            'period_date' => [
                'required' => true,
                'type' => 'date',
            ],
            'rag' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Green', 'Amber', 'Red'],
            ],
            'recorded_by' => [
                'required' => false,
                'type' => 'string',
            ],
            'value' => [
                'required' => true,
                'type' => 'number',
            ],
        ],
    ],
    'Meeting' => [
        'table' => 'cc_meeting',
        'fields' => [
            'agenda' => [
                'required' => false,
                'type' => 'text',
            ],
            'apologies' => [
                'required' => false,
                'type' => 'array',
                'relation' => 'Employee',
            ],
            'attendees' => [
                'required' => false,
                'type' => 'array',
                'relation' => 'Employee',
            ],
            'chair' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'committee' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Board', 'Board Risk Committee', 'ERC', 'Credit Committee', 'Other'],
            ],
            'date' => [
                'required' => false,
                'type' => 'date',
            ],
            'location' => [
                'required' => false,
                'type' => 'string',
            ],
            'minutes' => [
                'required' => false,
                'type' => 'text',
            ],
            'next_meeting_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'required_quorum' => [
                'required' => false,
                'type' => 'integer',
                'min' => 0,
            ],
            'status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Scheduled', 'Held', 'Minutes Draft', 'Minutes Approved'],
            ],
            'title' => [
                'required' => true,
                'type' => 'string',
            ],
        ],
    ],
    'Policy' => [
        'table' => 'cc_policy',
        'fields' => [
            'absolute_prohibition_limit' => [
                'required' => false,
                'type' => 'number',
            ],
            'approval_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'approved_by' => [
                'required' => false,
                'type' => 'string',
            ],
            'cumulative_limit' => [
                'required' => false,
                'type' => 'number',
            ],
            'department' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Department',
            ],
            'gift_approval_threshold' => [
                'required' => false,
                'type' => 'number',
            ],
            'governs_gh_register' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Yes', 'No'],
            ],
            'hospitality_approval_threshold' => [
                'required' => false,
                'type' => 'number',
            ],
            'limits_effective_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'next_review_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'owner' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'policy_name' => [
                'required' => true,
                'type' => 'string',
            ],
            'review_frequency' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['6 months', 'Annual', '2 years', '3 years'],
            ],
            'status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Current', 'Due for Review', 'Overdue', 'Archived'],
            ],
            'summary' => [
                'required' => false,
                'type' => 'text',
            ],
            'version' => [
                'required' => false,
                'type' => 'string',
            ],
        ],
    ],
    'ReportDefinition' => [
        'table' => 'cc_report_definition',
        'fields' => [
            'columns' => [
                'required' => false,
                'type' => 'text',
            ],
            'filters' => [
                'required' => false,
                'type' => 'text',
            ],
            'last_run' => [
                'required' => false,
                'type' => 'datetime',
            ],
            'name' => [
                'required' => true,
                'type' => 'string',
            ],
            'schedule_format' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Excel', 'PDF'],
            ],
            'schedule_frequency' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['None', 'Daily', 'Weekly', 'Monthly'],
            ],
            'schedule_recipients' => [
                'required' => false,
                'type' => 'array',
            ],
            'sort_direction' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['asc', 'desc'],
            ],
            'sort_field' => [
                'required' => false,
                'type' => 'text',
            ],
            'source' => [
                'required' => true,
                'type' => 'enum',
                'values' => ['Risks', 'Controls', 'KRIs', 'Actions', 'Incidents', 'Policies', 'Insurance', 'Gifts & Hospitality', 'Attestations', 'Conflicts of Interest', 'Third-Party', 'Meeting Attendance', 'Employees'],
            ],
        ],
    ],
    'Risk' => [
        'table' => 'cc_risk',
        'fields' => [
            'appetite_status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Green', 'Amber', 'Red'],
            ],
            'category' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'RiskCategory',
            ],
            'cause' => [
                'required' => false,
                'type' => 'text',
            ],
            'consequence' => [
                'required' => false,
                'type' => 'text',
            ],
            'department' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Department',
            ],
            'description' => [
                'required' => false,
                'type' => 'text',
            ],
            'event' => [
                'required' => false,
                'type' => 'text',
            ],
            'inherent_impact' => [
                'required' => false,
                'type' => 'integer',
                'min' => 1,
                'max' => 5,
            ],
            'inherent_likelihood' => [
                'required' => false,
                'type' => 'integer',
                'min' => 1,
                'max' => 5,
            ],
            'inherent_score' => [
                'required' => false,
                'type' => 'integer',
            ],
            'initiative' => [
                'required' => false,
                'type' => 'text',
            ],
            'last_modified_by' => [
                'required' => false,
                'type' => 'email',
            ],
            'last_modified_date' => [
                'required' => false,
                'type' => 'datetime',
            ],
            'last_reviewed' => [
                'required' => false,
                'type' => 'date',
            ],
            'next_review' => [
                'required' => false,
                'type' => 'date',
            ],
            'owner' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'parent_risk' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Risk',
            ],
            'project_status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Active', 'Closed'],
            ],
            'residual_impact' => [
                'required' => false,
                'type' => 'integer',
                'min' => 1,
                'max' => 5,
            ],
            'residual_likelihood' => [
                'required' => false,
                'type' => 'integer',
                'min' => 1,
                'max' => 5,
            ],
            'residual_score' => [
                'required' => false,
                'type' => 'integer',
            ],
            'risk_ref' => [
                'required' => false,
                'type' => 'string',
            ],
            'status' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Open', 'Monitoring', 'Closed'],
            ],
            'target_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'target_score' => [
                'required' => false,
                'type' => 'number',
            ],
            'tier' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Strategic', 'Operational', 'Departmental', 'Project & Change'],
            ],
            'title' => [
                'required' => true,
                'type' => 'string',
            ],
            'trend' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Improving', 'Stable', 'Worsening'],
            ],
        ],
    ],
    'RiskCategory' => [
        'table' => 'cc_risk_category',
        'fields' => [
            'appetite_position' => [
                'required' => false,
                'type' => 'text',
            ],
            'category_owner' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'definition' => [
                'required' => false,
                'type' => 'text',
            ],
            'name' => [
                'required' => true,
                'type' => 'string',
            ],
            'rag' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Green', 'Amber', 'Red'],
            ],
        ],
    ],
    'StandingMember' => [
        'table' => 'cc_standing_member',
        'fields' => [
            'active' => [
                'required' => false,
                'type' => 'boolean',
            ],
            'committee' => [
                'required' => true,
                'type' => 'relation',
                'relation' => 'Committee',
            ],
            'employee' => [
                'required' => true,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'role_at_meeting' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Chair', 'Member', 'Secretary', 'Attendee', 'Guest'],
            ],
        ],
    ],
    'ThirdParty' => [
        'table' => 'cc_third_party',
        'fields' => [
            'contract_owner' => [
                'required' => false,
                'type' => 'relation',
                'relation' => 'Employee',
            ],
            'criticality' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Critical', 'High', 'Medium', 'Low'],
            ],
            'provider' => [
                'required' => true,
                'type' => 'string',
            ],
            'review_date' => [
                'required' => false,
                'type' => 'date',
            ],
            'risk_rating' => [
                'required' => false,
                'type' => 'enum',
                'values' => ['Red', 'Amber', 'Green'],
            ],
            'service' => [
                'required' => false,
                'type' => 'text',
            ],
        ],
    ],
];
