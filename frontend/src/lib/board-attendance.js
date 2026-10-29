import { base44 } from "@/api/base44Client";

const nowISO = () => new Date().toISOString();

// Auto-populate a meeting's Attendance register from a committee's standing
// members (status = Invited) and snapshot the committee quorum onto the meeting.
export async function populateAttendanceForMeeting(meetingId, committeeName, user) {
  if (!meetingId || !committeeName) return 0;
  const committees = await base44.entities.Committee.filter({ name: committeeName });
  const committee = committees[0];
  if (!committee) return 0;
  const members = await base44.entities.StandingMember.filter({ committee: committee.id });
  const active = members.filter((m) => m.active !== false);
  if (active.length) {
    await base44.entities.Attendance.bulkCreate(
      active.map((m) => ({
        meeting: meetingId,
        invitee: m.employee,
        role_at_meeting: m.role_at_meeting || "Member",
        attendance_status: "Invited",
      }))
    );
  }
  await base44.entities.Meeting.update(meetingId, {
    required_quorum: committee.quorum || 0,
    last_modified_by: user?.id || null,
    last_modified_date: nowISO(),
  });
  return active.length;
}

// One-time migration of legacy Meeting.attendees / Meeting.apologies into
// Attendance rows. Called on demand from the Attendance panel when a meeting
// still carries the old free-form arrays and has no register yet.
export async function seedAttendanceFromLegacy(meeting, user) {
  const att = meeting.attendees || [];
  const apo = meeting.apologies || [];
  const rows = [];
  const seen = new Set();
  for (const eid of att) {
    rows.push({ meeting: meeting.id, invitee: eid, role_at_meeting: "Member", attendance_status: "Present" });
    seen.add(eid);
  }
  for (const eid of apo) {
    if (!seen.has(eid)) {
      rows.push({ meeting: meeting.id, invitee: eid, role_at_meeting: "Member", attendance_status: "Apologies" });
      seen.add(eid);
    }
  }
  if (meeting.chair && !seen.has(meeting.chair)) {
    rows.push({ meeting: meeting.id, invitee: meeting.chair, role_at_meeting: "Chair", attendance_status: "Invited" });
  }
  if (rows.length) {
    await base44.entities.Attendance.bulkCreate(rows);
  }
  return rows.length;
}