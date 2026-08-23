import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Exclusão de Dados — Kortia CRM',
  description:
    'Como solicitar a exclusão de dados pessoais tratados pela plataforma Kortia CRM (Armazém Decora LTDA), incluindo dados obtidos por integrações com a Meta (Facebook/Instagram/WhatsApp).',
  robots: { index: true, follow: true },
};

const UPDATED_AT = '23 de agosto de 2026';
const CONTACT = 'ba2vendasml@gmail.com';

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
        {children}
      </div>
    </section>
  );
}

export default function ExclusaoDeDadosPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-white px-6 py-12 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-sm font-medium text-primary">Kortia CRM</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Exclusão de Dados
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Última atualização: {UPDATED_AT}
        </p>
      </header>

      <div className="mt-2">
        <p className="mt-6 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          A plataforma <strong>Kortia CRM</strong>, operada por{' '}
          <strong>ARMAZÉM DECORA LTDA</strong> (CNPJ 37.760.408/0001-71), respeita
          o direito de exclusão previsto na Lei nº 13.709/2018 (LGPD) e nas
          políticas da Meta. Esta página explica como solicitar a exclusão dos
          seus dados pessoais.
        </p>

        <Section title="1. Quais dados podem ser excluídos">
          <p>
            Podemos tratar dados pessoais como nome, telefone, e-mail, histórico de
            conversas e informações de contato, inclusive dados recebidos por
            integrações oficiais com a <strong>Meta</strong> (Facebook, Instagram e
            WhatsApp) — por exemplo, leads de formulários de anúncios (Lead Ads) e
            mensagens trocadas nesses canais. Todos esses dados podem ser objeto de
            solicitação de exclusão.
          </p>
        </Section>

        <Section title="2. Como solicitar a exclusão">
          <p>
            Envie um e-mail para <strong>{CONTACT}</strong> com o assunto{' '}
            <strong>&quot;Exclusão de Dados&quot;</strong>, informando:
          </p>
          <ul className="ml-5 list-disc space-y-1">
            <li>seu nome completo;</li>
            <li>
              o telefone e/ou e-mail associado aos dados (o mesmo usado no contato
              com a empresa);
            </li>
            <li>
              se aplicável, o nome da empresa/loja com a qual você se comunicou.
            </li>
          </ul>
          <p>
            Por segurança, poderemos solicitar informações adicionais para confirmar
            a sua identidade antes de processar o pedido.
          </p>
        </Section>

        <Section title="3. Prazo">
          <p>
            Confirmada a identidade, a exclusão dos dados é realizada em até{' '}
            <strong>30 (trinta) dias</strong>, ressalvadas as hipóteses em que a
            conservação seja exigida por obrigação legal ou regulatória. Dados de
            uma organização (empresa cliente) seguem, adicionalmente, as regras de
            eliminação previstas no Acordo de Tratamento de Dados (DPA).
          </p>
        </Section>

        <Section title="4. Dados obtidos pela Meta (Facebook / Instagram / WhatsApp)">
          <p>
            Se os seus dados foram coletados por meio das integrações com a Meta,
            você pode solicitar a exclusão diretamente pelo e-mail acima. Também é
            possível gerenciar ou remover a conexão do aplicativo nas configurações
            da sua conta da Meta. Após a solicitação, removeremos os dados
            associados ao seu identificador nesses canais dentro do prazo indicado
            no item 3.
          </p>
        </Section>

        <Section title="5. Contato do Encarregado (DPO)">
          <p>
            Para dúvidas sobre esta página, sobre a exclusão ou sobre o tratamento
            dos seus dados, fale com o Encarregado pela Proteção de Dados pelo
            e-mail <strong>{CONTACT}</strong>. Consulte também nossa{' '}
            <a href="/privacidade" className="text-primary underline">
              Política de Privacidade
            </a>{' '}
            e os{' '}
            <a href="/termos" className="text-primary underline">
              Termos de Uso
            </a>
            .
          </p>
        </Section>
      </div>

      <footer className="mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-400 dark:border-zinc-800">
        © {new Date().getFullYear()} Armazém Decora LTDA — Kortia CRM. Todos os
        direitos reservados.
      </footer>
    </main>
  );
}
