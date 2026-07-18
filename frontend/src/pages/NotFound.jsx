import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import PageShell from '../components/PageShell';

export default function NotFound() {
  return (
    <PageShell eyebrow="Error 404" title="This place is off the map.">
      <div className="reveal max-w-xl">
        <p className="leading-relaxed text-[var(--cream-dim)]">
          The page you were looking for does not exist, or it may have moved. Let us point you back
          to solid ground.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link to="/">
            <button className="btn-rust flex items-center gap-2">
              Back home <ArrowRight size={16} />
            </button>
          </Link>
          <Link to="/studio">
            <button className="btn-ghost">Open the studio</button>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
