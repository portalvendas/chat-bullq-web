'use client';

import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  X,
  Loader2,
  Plus,
  Trash2,
  Reply,
  ExternalLink,
  Phone,
} from 'lucide-react';
import {
  templatesService,
  type WhatsappTemplate,
  type TemplateComponent,
  type TemplateButton,
  type TemplateInput,
} from '@/features/templates/services/templates.service';

type BtnType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
interface EditableButton {
  type: BtnType;
  text: string;
  url?: string;
  phone?: string;
}

function parseComponents(t: WhatsappTemplate | null) {
  const comps = (t?.components ?? []) as TemplateComponent[];
  let header = '';
  let body = t?.bodyText ?? '';
  let footer = '';
  let buttons: EditableButton[] = [];
  for (const c of comps) {
    if (c.type === 'HEADER' && c.format === 'TEXT') header = c.text ?? '';
    else if (c.type === 'BODY') body = c.text ?? body;
    else if (c.type === 'FOOTER') footer = c.text ?? '';
    else if (c.type === 'BUTTONS') {
      buttons = (c.buttons ?? []).map((b) => {
        if (b.type === 'URL') return { type: 'URL', text: b.text, url: b.url };
        if (b.type === 'PHONE_NUMBER')
          return { type: 'PHONE_NUMBER', text: b.text, phone: b.phone_number };
        return { type: 'QUICK_REPLY', text: b.text };
      });
    }
  }
  return { header, body, footer, buttons };
}

export function TemplateEditor({
  template,
  onClose,
  onSaved,
}: {
  template: WhatsappTemplate | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const init = useMemo(() => parseComponents(template), [template]);
  const [name, setName] = useState(template?.name ?? '');
  const [category, setCategory] = useState(template?.category ?? 'MARKETING');
  const [language, setLanguage] = useState(template?.language ?? 'pt_BR');
  const [status, setStatus] = useState(template?.status ?? 'APPROVED');
  const [waba, setWaba] = useState(template?.waba ?? '');
  const [header, setHeader] = useState(init.header);
  const [hasHeader, setHasHeader] = useState(!!init.header);
  const [body, setBody] = useState(init.body);
  const [footer, setFooter] = useState(init.footer);
  const [buttons, setButtons] = useState<EditableButton[]>(init.buttons);

  const buildComponents = (): TemplateComponent[] => {
    const comps: TemplateComponent[] = [];
    if (hasHeader && header.trim())
      comps.push({ type: 'HEADER', format: 'TEXT', text: header.trim() });
    comps.push({ type: 'BODY', text: body.trim() });
    if (footer.trim()) comps.push({ type: 'FOOTER', text: footer.trim() });
    if (buttons.length) {
      const bs: TemplateButton[] = buttons
        .filter((b) => b.text.trim())
        .map((b) => {
          if (b.type === 'URL')
            return { type: 'URL', text: b.text.trim(), url: (b.url ?? '').trim() };
          if (b.type === 'PHONE_NUMBER')
            return {
              type: 'PHONE_NUMBER',
              text: b.text.trim(),
              phone_number: (b.phone ?? '').trim(),
            };
          return { type: 'QUICK_REPLY', text: b.text.trim() };
        });
      if (bs.length) comps.push({ type: 'BUTTONS', buttons: bs });
    }
    return comps;
  };

  const save = useMutation({
    mutationFn: () => {
      const dto: TemplateInput = {
        name: name.trim(),
        bodyText: body.trim(),
        category,
        language,
        status,
        waba: waba.trim() || null,
        components: buildComponents(),
      };
      return template
        ? templatesService.update(template.id, dto)
        : templatesService.create(dto);
    },
    onSuccess: () => {
      toast.success(template ? 'Modelo atualizado' : 'Modelo criado');
      onSaved();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro ao salvar modelo'),
  });

  const addButton = (type: BtnType) =>
    setButtons((b) => [...b, { type, text: '' }]);
  const patchButton = (i: number, patch: Partial<EditableButton>) =>
    setButtons((arr) => arr.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const removeButton = (i: number) =>
    setButtons((arr) => arr.filter((_, idx) => idx !== i));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={() => !save.isPending && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
      >
        {/* Coluna do formulário */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              {name || (template ? 'Editar modelo' : 'Novo modelo')}
            </h2>
            <button
              onClick={onClose}
              className="text-sm font-medium text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              Cancelar
            </button>
          </div>

          <div className="mb-3 flex items-center gap-2">
            <span className="inline-block rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {status === 'APPROVED'
                ? 'Aprovado'
                : status === 'PENDING'
                  ? 'Pendente'
                  : status === 'REJECTED'
                    ? 'Rejeitado'
                    : status}
            </span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            >
              <option value="MARKETING">Categoria de marketing</option>
              <option value="UTILITY">Categoria utilidade</option>
              <option value="AUTHENTICATION">Categoria autenticação</option>
            </select>
          </div>

          <Field label="Nome do modelo">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: BM02 Boas vindas"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="ID WABA">
              <input
                value={waba}
                onChange={(e) => setWaba(e.target.value)}
                placeholder="Fonte não conectada"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-xs outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </Field>
            <Field label="Idioma">
              <input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </Field>
          </div>

          <Field label="Cabeçalho (opcional)">
            <div className="flex items-center gap-2">
              <select
                value={hasHeader ? 'TEXT' : 'NONE'}
                onChange={(e) => setHasHeader(e.target.value === 'TEXT')}
                className="rounded-md border border-zinc-300 bg-white px-2 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="NONE">Sem cabeçalho</option>
                <option value="TEXT">Texto</option>
              </select>
              {hasHeader && (
                <input
                  value={header}
                  onChange={(e) => setHeader(e.target.value.slice(0, 60))}
                  placeholder="Texto do cabeçalho"
                  className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              )}
            </div>
          </Field>

          <Field label="Corpo do texto">
            <div className="rounded-md border border-zinc-300 focus-within:border-primary dark:border-zinc-700">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value.slice(0, 1024))}
                rows={4}
                placeholder="Texto do modelo…"
                className="w-full resize-y rounded-md bg-white px-3 py-2 text-sm outline-none dark:bg-zinc-900 dark:text-zinc-100"
              />
              <div className="px-3 pb-1 text-right text-[11px] text-zinc-400">
                {body.length}/1024
              </div>
            </div>
          </Field>

          <Field label="Rodapé (opcional)">
            <input
              value={footer}
              onChange={(e) => setFooter(e.target.value.slice(0, 60))}
              placeholder="Mensagem no rodapé"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <div className="mt-0.5 text-right text-[11px] text-zinc-400">
              {footer.length}/60
            </div>
          </Field>

          {/* Botões */}
          <div className="mt-3">
            <label className="text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
              Botões (opcional)
            </label>
            <div className="mt-1 space-y-2">
              {buttons.map((b, i) => (
                <div
                  key={i}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800"
                >
                  <select
                    value={b.type}
                    onChange={(e) => patchButton(i, { type: e.target.value as BtnType })}
                    className="rounded border border-zinc-300 bg-white px-1.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  >
                    <option value="QUICK_REPLY">Resposta rápida</option>
                    <option value="URL">Link (URL)</option>
                    <option value="PHONE_NUMBER">Telefone</option>
                  </select>
                  <input
                    value={b.text}
                    onChange={(e) => patchButton(i, { text: e.target.value.slice(0, 25) })}
                    placeholder="Texto do botão"
                    className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                  {b.type === 'URL' && (
                    <input
                      value={b.url ?? ''}
                      onChange={(e) => patchButton(i, { url: e.target.value })}
                      placeholder="https://…"
                      className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  )}
                  {b.type === 'PHONE_NUMBER' && (
                    <input
                      value={b.phone ?? ''}
                      onChange={(e) => patchButton(i, { phone: e.target.value })}
                      placeholder="+55…"
                      className="flex-1 rounded border border-zinc-300 bg-white px-2 py-1 text-xs outline-none focus:border-primary dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                  )}
                  <button
                    onClick={() => removeButton(i)}
                    className="text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            {buttons.length < 3 && (
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => addButton('QUICK_REPLY')}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Plus className="h-3.5 w-3.5" /> Resposta rápida
                </button>
                <button
                  onClick={() => addButton('URL')}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-zinc-300 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Plus className="h-3.5 w-3.5" /> Chamada para ação
                </button>
              </div>
            )}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={save.isPending}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || !name.trim() || !body.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Salvar
            </button>
          </div>
        </div>

        {/* Coluna da prévia (celular) */}
        <div className="hidden w-[320px] shrink-0 items-start justify-center border-l border-zinc-200 bg-zinc-100 p-6 dark:border-zinc-800 dark:bg-zinc-900 md:flex">
          <PhonePreview
            header={hasHeader ? header : ''}
            body={body}
            footer={footer}
            buttons={buttons}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-[12px] font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      {children}
    </div>
  );
}

function PhonePreview({
  header,
  body,
  footer,
  buttons,
}: {
  header: string;
  body: string;
  footer: string;
  buttons: EditableButton[];
}) {
  return (
    <div className="w-[260px] rounded-[2rem] border-[6px] border-zinc-800 bg-zinc-800 shadow-xl">
      {/* topo */}
      <div className="flex items-center justify-between rounded-t-[1.6rem] bg-emerald-700 px-3 py-2 text-white">
        <div className="h-1 w-10 rounded-full bg-white/40" />
        <div className="flex gap-2 text-[10px]">📶 📡 🔋</div>
      </div>
      {/* fundo do chat */}
      <div
        className="min-h-[360px] space-y-2 px-3 py-3"
        style={{
          background:
            '#e5ddd5 url("data:image/svg+xml,%3Csvg width=%2240%22 height=%2240%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Ccircle cx=%222%22 cy=%222%22 r=%221%22 fill=%22%23d3ccc0%22/%3E%3C/svg%3E")',
        }}
      >
        <div className="max-w-[85%] rounded-lg rounded-tl-sm bg-white px-2.5 py-2 text-[12px] text-zinc-800 shadow-sm">
          {header && <div className="mb-1 font-bold">{header}</div>}
          <div className="whitespace-pre-wrap">
            {body || <span className="text-zinc-400">Prévia da mensagem…</span>}
          </div>
          {footer && <div className="mt-1 text-[10px] text-zinc-400">{footer}</div>}
        </div>
        {buttons.filter((b) => b.text.trim()).length > 0 && (
          <div className="max-w-[85%] space-y-0.5">
            {buttons
              .filter((b) => b.text.trim())
              .map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-[12px] font-medium text-sky-600 shadow-sm"
                >
                  {b.type === 'URL' ? (
                    <ExternalLink className="h-3.5 w-3.5" />
                  ) : b.type === 'PHONE_NUMBER' ? (
                    <Phone className="h-3.5 w-3.5" />
                  ) : (
                    <Reply className="h-3.5 w-3.5" />
                  )}
                  {b.text}
                </div>
              ))}
          </div>
        )}
      </div>
      {/* barra de digitação */}
      <div className="flex items-center gap-2 rounded-b-[1.6rem] bg-zinc-100 px-3 py-2 dark:bg-zinc-200">
        <div className="h-6 flex-1 rounded-full bg-white" />
        <div className="h-6 w-6 rounded-full bg-emerald-600" />
      </div>
    </div>
  );
}
