'use client';

/**
 * Painel de enriquecimento do lead — reutilizado no detalhe do card e no
 * painel de contato do inbox. Mostra:
 *  - Cabeçalho: DATA do lead + FONTE (Facebook, Instagram, Google, LP…)
 *  - Contato: nome, telefone, e-mail, tags
 *  - Tracking: utm_source/medium/campaign/content/term, fbclid, gclid,
 *    página, IP, user-agent
 *
 * A fonte é derivada de (nesta ordem): utm_source → metadata.source →
 * fbclid/gclid → canal da conversa. Nunca inventa: se não houver sinal,
 * mostra "Direto/Desconhecido".
 */
import {
  Facebook,
  Instagram,
  Globe,
  Search,
  ShoppingBag,
  MessageCircle,
  Mail,
  Phone,
  Tag as TagIcon,
  Calendar,
} from 'lucide-react';
import type {
  CardDetail,
  LeadTracking,
} from '../services/pipelines.service';

// ─── Derivação de fonte ──────────────────────────────────────────────

interface DerivedSource {
  label: string;
  Icon: typeof Facebook;
  cls: string;
}

function normalize(s: unknown): string {
  return String(s ?? '').trim().toLowerCase();
}

export function deriveLeadSource(
  tracking: LeadTracking,
  metaSource?: unknown,
  channelType?: string,
): DerivedSource {
  const utm = normalize(tracking.utm_source);
  const src = normalize(metaSource ?? tracking.source);
  const hasFb = !!tracking.fbclid;
  const hasG = !!tracking.gclid;
  const chan = normalize(channelType);

  const fb: DerivedSource = {
    label: 'Facebook',
    Icon: Facebook,
    cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  };
  const ig: DerivedSource = {
    label: 'Instagram',
    Icon: Instagram,
    cls: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  };
  const google: DerivedSource = {
    label: 'Google',
    Icon: Search,
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  const lp: DerivedSource = {
    label: 'Landing Page',
    Icon: Globe,
    cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  // 1) utm_source explícito
  if (utm) {
    if (utm.includes('insta') || utm === 'ig') return ig;
    if (
      utm.includes('meta') ||
      utm.includes('face') ||
      utm === 'fb' ||
      utm.includes('fban') ||
      utm.includes('fbads')
    )
      return fb;
    if (utm.includes('google') || utm.includes('gads') || utm.includes('adwords'))
      return google;
    // utm_source livre (ex.: newsletter, parceiro): mostra como veio.
    return {
      label: tracking.utm_source as string,
      Icon: Globe,
      cls: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
    };
  }

  // 2) metadata.source (origem interna)
  if (src) {
    if (src.includes('landing') || src === 'lp') return lp;
    if (src.includes('facebook') || src.includes('leadads') || src.includes('meta'))
      return { ...fb, label: 'Facebook Lead Ads' };
    if (src.includes('insta')) return ig;
    if (src.includes('mercado'))
      return {
        label: 'Mercado Livre',
        Icon: ShoppingBag,
        cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      };
    if (src.includes('shopee'))
      return {
        label: 'Shopee',
        Icon: ShoppingBag,
        cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      };
  }

  // 3) sinais de clique
  if (hasFb) return fb;
  if (hasG) return google;

  // 4) canal da conversa como último recurso
  if (chan.includes('instagram')) return ig;
  if (chan.includes('whatsapp') || chan.includes('zappfy'))
    return {
      label: 'WhatsApp',
      Icon: Phone,
      cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
  if (chan.includes('mercado'))
    return {
      label: 'Mercado Livre',
      Icon: ShoppingBag,
      cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    };
  if (chan.includes('shopee'))
    return {
      label: 'Shopee',
      Icon: ShoppingBag,
      cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    };

  return {
    label: 'Direto / Desconhecido',
    Icon: MessageCircle,
    cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300',
  };
}

function getTracking(card: CardDetail): LeadTracking {
  const fromContact = (card.contact?.metadata as any)?.tracking;
  const fromCard = (card.metadata as any)?.tracking;
  return (fromContact ?? fromCard ?? {}) as LeadTracking;
}

function getMetaSource(card: CardDetail): unknown {
  return (
    (card.contact?.metadata as any)?.source ?? (card.metadata as any)?.source
  );
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

// ─── Cabeçalho (Data + Fonte) ────────────────────────────────────────

export function LeadHeader({ card }: { card: CardDetail }) {
  const tracking = getTracking(card);
  const source = deriveLeadSource(
    tracking,
    getMetaSource(card),
    card.conversation?.channel?.type,
  );
  const { Icon } = source;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50">
      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300">
        <Calendar className="h-3.5 w-3.5 text-zinc-400" />
        Lead em <strong className="font-medium">{fmtDate(card.createdAt)}</strong>
      </span>
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${source.cls}`}
        title="Fonte do lead"
      >
        <Icon className="h-3 w-3" />
        {source.label}
      </span>
    </div>
  );
}

// ─── Bloco completo de enriquecimento ────────────────────────────────

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wide text-zinc-400">
        {label}
      </span>
      <span className="break-words text-xs text-zinc-800 dark:text-zinc-200">
        {value}
      </span>
    </div>
  );
}

export function LeadEnrichment({ card }: { card: CardDetail }) {
  const c = card.contact;
  const tracking = getTracking(card);
  const hasTracking = Object.keys(tracking).some(
    (k) => tracking[k] !== undefined && tracking[k] !== '' && tracking[k] !== null,
  );

  return (
    <div className="space-y-3">
      {/* Contato */}
      <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Contato
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Nome" value={c?.name} />
          <Field label="Telefone" value={c?.phone} />
          <Field label="E-mail" value={c?.email} />
        </div>
        {c?.tags && c.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <TagIcon className="h-3 w-3 text-zinc-400" />
            {c.tags.map((t) => (
              <span
                key={t.id}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${t.color}22`, color: t.color }}
              >
                {t.name}
              </span>
            ))}
          </div>
        )}
        {!c?.email && !c?.phone && !c?.name && (
          <p className="text-xs text-zinc-400">Sem dados de contato.</p>
        )}
      </div>

      {/* Tracking */}
      <div className="rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
          Rastreamento (tracking)
        </p>
        {hasTracking ? (
          <div className="grid grid-cols-2 gap-2">
            <Field label="utm_source" value={tracking.utm_source} />
            <Field label="utm_medium" value={tracking.utm_medium} />
            <Field label="utm_campaign" value={tracking.utm_campaign} />
            <Field label="utm_content" value={tracking.utm_content} />
            <Field label="utm_term" value={tracking.utm_term} />
            <Field label="fbclid" value={tracking.fbclid} />
            <Field label="gclid" value={tracking.gclid} />
            <Field label="IP" value={tracking.client_ip} />
            <div className="col-span-2">
              <Field label="Página" value={tracking.pagina} />
            </div>
            <div className="col-span-2">
              <Field label="Referrer" value={tracking.referrer} />
            </div>
            <div className="col-span-2">
              <Field label="User-Agent" value={tracking.user_agent} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-zinc-400">
            Nenhum dado de rastreamento capturado para este lead.
          </p>
        )}
      </div>
    </div>
  );
}
