// LOCATION: src/components/tasks/TaskStatusBadge.jsx
import { FiClock, FiPlayCircle, FiUpload, FiEye, FiCheckCircle, FiXCircle, FiSlash, FiAlertTriangle, FiPauseCircle } from 'react-icons/fi';

// Guide §8/§12 — text + icon + semantic color, never color alone.
const CONFIG = {
  pending:              { label: 'Pending',              icon: FiClock,         cls: 'badge-navy'    },
  awaiting_activation:  { label: 'Awaiting Activation',  icon: FiClock,         cls: 'badge-warning' },
  active:               { label: 'Active',                icon: FiPlayCircle,    cls: 'badge-success' },
  in_progress:          { label: 'In Progress',           icon: FiPlayCircle,    cls: 'badge-success' },
  submitted:            { label: 'Submitted',             icon: FiUpload,        cls: 'badge-info'    },
  under_review:         { label: 'Under Review',          icon: FiEye,           cls: 'badge-info'    },
  completed:            { label: 'Completed',             icon: FiCheckCircle,   cls: 'badge-success' },
  expired:              { label: 'Expired',                icon: FiAlertTriangle, cls: 'badge-danger'  },
  cancelled:            { label: 'Cancelled',              icon: FiSlash,         cls: 'badge-navy'    },
  failed:               { label: 'Failed',                 icon: FiXCircle,       cls: 'badge-danger'  },
  // Task-level pause (Task::deactivated_at) — mirrored onto every
  // assignment's live_status while set. Previously missing here, so a
  // deactivated task's badge silently fell back to "Pending", which
  // actively hid the fact that an admin had paused it.
  deactivated:          { label: 'Deactivated',            icon: FiPauseCircle,   cls: 'badge-warning' },
};

export default function TaskStatusBadge({ status, size = 'md' }) {
  const c = CONFIG[status] || CONFIG.pending;
  const Icon = c.icon;
  return (
    <span className={`badge ${c.cls}`} style={{
      display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
      fontWeight: 600, fontSize: size === 'sm' ? '0.7rem' : '0.75rem',
      padding: size === 'sm' ? '0.25rem 0.55rem' : '0.3rem 0.65rem',
    }}>
      <Icon size={size === 'sm' ? 11 : 12} />
      {c.label}
    </span>
  );
}
