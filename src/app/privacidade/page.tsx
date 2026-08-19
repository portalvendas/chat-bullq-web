import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade — Kortia CRM',
  description:
    'Política de Privacidade da plataforma Kortia CRM (Armazém Decora): como coletamos, usamos, compartilhamos e protegemos dados pessoais, incluindo leads recebidos via Facebook Lead Ads.',
  robots: { index: true, follow: true },
};

const UPDATED_AT = '28 de julho de 2026';

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

export default function PrivacidadePage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-white px-6 py-12 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-sm font-medium text-primary">Kortia CRM</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Última atualização: {UPDATED_AT}
        </p>
      </header>

      <div className="mt-2">
        <Section title="1. Quem somos">
          <p>
            Esta Política de Privacidade descreve como a plataforma{' '}
            <strong>Kortia CRM</strong>, operada por <strong>Armazém Decora</strong>{' '}
            (&quot;nós&quot;, &quot;nossa plataforma&quot;), coleta, utiliza,
            armazena, compartilha e protege dados pessoais, em conformidade com a
            Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD) e com as
            políticas das plataformas parceiras, incluindo a Meta (Facebook e
            Instagram).
          </p>
          <p>
            O Kortia CRM é uma plataforma de atendimento e gestão comercial
            omnichannel, que centraliza conversas e leads de diferentes canais
            (WhatsApp, Facebook, Instagram, marketplaces e formulários de
            anúncios) para equipes de vendas e atendimento.
          </p>
        </Section>

        <Section title="2. Dados que coletamos">
          <p>Podemos coletar e tratar as seguintes categorias de dados:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Dados de contato de leads e clientes:</strong> nome,
              telefone, e-mail e demais informações preenchidas por você em
              formulários de anúncios (por exemplo, os formulários instantâneos do{' '}
              <strong>Facebook Lead Ads</strong>) ou informadas durante o
              atendimento.
            </li>
            <li>
              <strong>Conteúdo de conversas:</strong> mensagens trocadas nos
              canais integrados, necessárias para prestar o atendimento e o
              acompanhamento comercial.
            </li>
            <li>
              <strong>Dados de origem e campanha:</strong> identificadores de
              formulário, anúncio e página de origem do lead, usados para
              organização do funil de vendas.
            </li>
            <li>
              <strong>Dados de usuários da plataforma:</strong> nome, e-mail e
              credenciais de acesso dos operadores que utilizam o Kortia CRM.
            </li>
          </ul>
        </Section>

        <Section title="3. Como coletamos os dados">
          <p>Os dados são obtidos:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              diretamente de você, ao preencher um formulário de anúncio ou ao
              iniciar uma conversa em um dos nossos canais;
            </li>
            <li>
              por meio de integrações oficiais com as plataformas Meta (Facebook
              Lead Ads e mensagens), WhatsApp Business Platform e marketplaces,
              autorizadas por você e/ou pelo responsável pela página/conta;
            </li>
            <li>
              automaticamente, quando um lead é enviado à nossa plataforma via
              webhook após a submissão de um formulário de anúncio.
            </li>
          </ul>
        </Section>

        <Section title="4. Como usamos os dados">
          <p>Utilizamos os dados pessoais para as seguintes finalidades:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>entrar em contato e prestar atendimento comercial e de suporte;</li>
            <li>
              registrar e organizar leads no funil de vendas e acompanhar o
              relacionamento;
            </li>
            <li>
              enviar comunicações relacionadas ao seu interesse manifestado no
              formulário ou na conversa;
            </li>
            <li>cumprir obrigações legais e regulatórias;</li>
            <li>
              melhorar e operar a plataforma, sempre respeitando a finalidade
              original da coleta.
            </li>
          </ul>
          <p>
            O tratamento se baseia, conforme o caso, no consentimento do titular,
            na execução de procedimentos preliminares a contrato, no legítimo
            interesse para atendimento e no cumprimento de obrigação legal.
          </p>
        </Section>

        <Section title="5. Compartilhamento de dados">
          <p>
            Não vendemos dados pessoais. Podemos compartilhá-los apenas quando
            necessário:
          </p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              com prestadores de serviço e provedores de infraestrutura que
              operam a plataforma em nosso nome (por exemplo, hospedagem e banco
              de dados), sob obrigações de confidencialidade;
            </li>
            <li>
              com as plataformas parceiras (Meta/WhatsApp) estritamente para
              viabilizar as integrações autorizadas;
            </li>
            <li>
              quando exigido por lei, ordem judicial ou autoridade competente.
            </li>
          </ul>
        </Section>

        <Section title="6. Armazenamento e segurança">
          <p>
            Os dados são armazenados em ambiente controlado e protegidos por
            medidas técnicas e organizacionais razoáveis contra acesso não
            autorizado, perda ou alteração indevida. O acesso é restrito a
            usuários autorizados e necessário para as finalidades descritas.
          </p>
        </Section>

        <Section title="7. Retenção">
          <p>
            Mantemos os dados pessoais apenas pelo tempo necessário para cumprir
            as finalidades desta Política ou obrigações legais. Após esse período,
            os dados são eliminados ou anonimizados.
          </p>
        </Section>

        <Section title="8. Seus direitos (LGPD)">
          <p>
            Você, como titular, pode a qualquer momento solicitar: confirmação da
            existência de tratamento; acesso aos seus dados; correção de dados
            incompletos ou desatualizados; anonimização, bloqueio ou eliminação de
            dados desnecessários; portabilidade; informação sobre
            compartilhamentos; e revogação do consentimento.
          </p>
        </Section>

        <Section title="9. Exclusão de dados">
          <p>
            Para solicitar a <strong>exclusão dos seus dados pessoais</strong> —
            incluindo dados recebidos por meio do Facebook Lead Ads — envie um
            e-mail para <strong>ba2vendasml@gmail.com</strong> com o assunto
            &quot;Exclusão de dados&quot;, informando o nome e o telefone/e-mail
            usados no cadastro. Processaremos a solicitação em prazo razoável,
            conforme a legislação aplicável.
          </p>
        </Section>

        <Section title="10. Integração com a Meta (Facebook e Instagram)">
          <p>
            Nossa plataforma utiliza APIs oficiais da Meta para receber leads de
            formulários de anúncios (Facebook Lead Ads) e para gerenciar
            mensagens. O uso desses dados segue esta Política e as{' '}
            <a
              href="https://developers.facebook.com/terms/"
              className="text-primary underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              Políticas da Plataforma da Meta
            </a>
            . Os dados obtidos por essas integrações são usados exclusivamente
            para as finalidades de atendimento e relacionamento aqui descritas.
          </p>
        </Section>

        <Section title="11. Alterações desta Política">
          <p>
            Esta Política pode ser atualizada periodicamente. A data da última
            atualização é indicada no topo desta página. Recomendamos a revisão
            regular deste documento.
          </p>
        </Section>

        <Section title="12. Contato">
          <p>
            Em caso de dúvidas sobre esta Política ou sobre o tratamento dos seus
            dados, entre em contato pelo e-mail{' '}
            <strong>ba2vendasml@gmail.com</strong>.
          </p>
        </Section>
      </div>

      <footer className="mt-12 border-t border-zinc-200 pt-6 text-sm text-zinc-400 dark:border-zinc-800">
        © {new Date().getFullYear()} Armazém Decora — Kortia CRM. Todos os
        direitos reservados.
      </footer>
    </main>
  );
}
