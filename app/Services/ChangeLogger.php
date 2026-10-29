<?php

namespace App\Services;

use App\Models\Compliance\ChangeLog;
use App\Support\Viewer;
use Illuminate\Database\Eloquent\Model;

/** The audit trail (cc_change_log). Written server-side on every change; the browser can't write it. */
class ChangeLogger
{
    private const IGNORED = ['created_date', 'updated_date', 'last_modified_date', 'last_modified_by'];

    public function __construct(private Viewer $viewer) {}

    public function log(string $action, string $entity, Model $record, array $before = []): void
    {
        $changes = null;
        if ($action === 'updated') {
            $after = $record->toArray();
            $diff = [];
            foreach ($after as $k => $v) {
                if (! in_array($k, self::IGNORED) && ($before[$k] ?? null) != $v) {
                    $diff[$k] = ['from' => $before[$k] ?? null, 'to' => $v];
                }
            }
            if (! $diff) {
                return;
            }
            $changes = json_encode($diff);
        }

        ChangeLog::create([
            'action' => $action,
            'entity' => $entity,
            'record_id' => (string) $record->getKey(),
            'record_ref' => $this->refOf($record),
            'changes' => $changes,
            'timestamp' => now(),
            'user' => $this->viewer->email,
            'user_name' => $this->viewer->name,
        ]);
    }

    private function refOf(Model $record): ?string
    {
        foreach ($record->getAttributes() as $k => $v) {
            if (str_ends_with($k, '_ref') && $v) {
                return (string) $v;
            }
        }

        return $record->title ?? $record->name ?? $record->policy_name ?? null;
    }
}
