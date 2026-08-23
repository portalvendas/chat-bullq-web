import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso — Kortia CRM',
  description:
    'Termos de Uso da plataforma Kortia CRM, operada por Armazém Decora LTDA: regras de uso, integrações, proteção de dados (LGPD) e responsabilidades.',
  robots: { index: true, follow: true },
};

const UPDATED_AT = '23 de agosto de 2026';

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

export default function TermosPage() {
  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-white px-6 py-12 dark:bg-zinc-900">
      <header className="border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <p className="text-sm font-medium text-primary">Kortia CRM</p>
        <h1 className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Termos de Uso
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Última atualização: {UPDATED_AT}
        </p>
      </header>

      <div className="mt-2">
        <p className="mt-6 text-[15px] leading-relaxed text-zinc-700 dark:text-zinc-300">
          A plataforma <strong>Kortia CRM</strong> é operada por{' '}
          <strong>ARMAZÉM DECORA LTDA</strong>, inscrita no CNPJ{' '}
          37.760.408/0001-71, com sede na Rua Adir Deola, 133, Bairro Industrial
          Parizotto, Ampére – PR, CEP 85640-000.
        </p>

        <Section title="1. Definições">
          <p>
            <strong>Plataforma / Kortia CRM:</strong> o sistema de CRM e
            atendimento multicanal (WhatsApp, Instagram, Mercado Livre, Shopee e
            outros), disponibilizado sob o modelo SaaS.
          </p>
          <p>
            <strong>Armazém Decora / &quot;Nós&quot;:</strong> pessoa jurídica que
            desenvolve e opera a Plataforma.
          </p>
          <p>
            <strong>Empresa Contratante / &quot;Você&quot;:</strong> pessoa
            jurídica ou física que contrata e usa a Plataforma, titular de uma
            organização (workspace) no sistema.
          </p>
          <p>
            <strong>Usuários:</strong> pessoas autorizadas pela Empresa
            Contratante a acessar a Plataforma (proprietário, administradores e
            agentes).
          </p>
          <p>
            <strong>Clientes Finais:</strong> pessoas com quem a Empresa
            Contratante se comunica pela Plataforma (leads, compradores, contatos).
          </p>
          <p>
            <strong>Dados Pessoais, Tratamento, Titular, Controlador, Operador:</strong>{' '}
            conforme a Lei nº 13.709/2018 (LGPD).
          </p>
        </Section>

        <Section title="2. Aceitação">
          <p>
            O uso da Plataforma implica aceitação integral destes Termos e da
            Política de Privacidade e do Acordo de Tratamento de Dados (DPA) a eles
            vinculados. Se você não concorda, não deve usar a Plataforma. Ao
            aceitar em nome de uma pessoa jurídica, você declara ter poderes para
            tanto.
          </p>
        </Section>

        <Section title="3. Cadastro, contas e acesso">
          <p>
            3.1. O acesso é feito por convite, com criação de conta vinculada a uma
            organização.
          </p>
          <p>
            3.2. Cada Usuário é responsável pela confidencialidade de suas
            credenciais e por todas as atividades realizadas em sua conta.
          </p>
          <p>
            3.3. A Empresa Contratante é responsável por gerir os acessos dos seus
            Usuários (papéis de proprietário, administrador e agente) e por
            revogá-los quando necessário.
          </p>
          <p>3.4. Você deve notificar-nos imediatamente sobre qualquer uso não autorizado.</p>
        </Section>

        <Section title="4. Uso aceitável">
          <p>
            Você concorda em NÃO utilizar a Plataforma para: (a) envio de mensagens
            não solicitadas em massa (spam) em violação às regras dos canais (ex.:
            políticas do WhatsApp/Meta, Mercado Livre); (b) conteúdo ilícito,
            difamatório, discriminatório ou que viole direitos de terceiros; (c)
            violar leis aplicáveis, incluindo a LGPD e o Código de Defesa do
            Consumidor; (d) tentar acessar áreas ou dados de outras organizações;
            (e) realizar engenharia reversa, sobrecarregar ou comprometer a
            segurança da Plataforma. O descumprimento pode acarretar suspensão ou
            encerramento.
          </p>
        </Section>

        <Section title="5. Integrações de terceiros">
          <p>
            A Plataforma integra-se a serviços de terceiros (Meta/WhatsApp,
            Instagram, Mercado Livre, Shopee, provedores de e-mail, entre outros).
            O uso desses serviços sujeita-se aos termos e políticas próprios de cada
            provedor. Não nos responsabilizamos por indisponibilidades, alterações
            ou decisões desses terceiros (ex.: bloqueio de número, mudança de API,
            suspensão de conta pelo provedor do canal).
          </p>
        </Section>

        <Section title="6. Planos, disponibilidade e suporte">
          <p>6.1. Os recursos disponíveis podem variar conforme o plano contratado.</p>
          <p>
            6.2. Empenhamo-nos em manter a Plataforma disponível, mas não garantimos
            operação ininterrupta ou livre de erros. Poderá haver manutenções
            programadas ou emergenciais.
          </p>
          <p>
            6.3. Podemos suspender o acesso de uma organização em caso de
            inadimplência, violação destes Termos, determinação legal ou risco à
            segurança.
          </p>
        </Section>

        <Section title="7. Propriedade intelectual">
          <p>
            7.1. A Plataforma, seu código, marcas, layout e documentação são de
            nossa titularidade ou licenciados a nós. Estes Termos não transferem
            qualquer propriedade intelectual.
          </p>
          <p>
            7.2. Os dados e conteúdos inseridos pela Empresa Contratante permanecem
            de sua titularidade. Você nos concede licença limitada para tratá-los
            estritamente para prestar o serviço, conforme o DPA.
          </p>
        </Section>

        <Section title="8. Proteção de dados (LGPD)">
          <p>
            8.1. No tratamento de Dados Pessoais dos Clientes Finais, a Empresa
            Contratante atua como Controladora e o Kortia CRM como Operador, nos
            termos da LGPD.
          </p>
          <p>
            8.2. As condições desse tratamento estão no Acordo de Tratamento de
            Dados (DPA), que integra estes Termos.
          </p>
          <p>
            8.3. Cada parte é responsável por cumprir as obrigações que lhe cabem
            sob a LGPD, incluindo a existência de base legal para o tratamento e o
            atendimento aos direitos dos titulares.
          </p>
        </Section>

        <Section title="9. Confidencialidade">
          <p>
            Cada parte manterá sigilo sobre informações confidenciais da outra a que
            tiver acesso, usando-as apenas para os fins do contrato, ressalvadas
            obrigações legais.
          </p>
        </Section>

        <Section title="10. Limitação de responsabilidade">
          <p>
            10.1. A Plataforma é fornecida &quot;no estado em que se encontra&quot;.
            Na máxima extensão permitida em lei, não respondemos por danos
            indiretos, lucros cessantes, perda de dados decorrente de fatores fora
            de nosso controle razoável, ou por atos de terceiros (inclusive
            provedores de canais).
          </p>
          <p>
            10.2. Eventuais limites de responsabilidade seguem o previsto no
            contrato ou plano vigente entre as partes.
          </p>
        </Section>

        <Section title="11. Vigência e encerramento">
          <p>11.1. Estes Termos vigoram enquanto durar o uso da Plataforma.</p>
          <p>
            11.2. Qualquer parte pode encerrar mediante aviso prévio de 30 (trinta)
            dias. Em caso de violação grave, o encerramento pode ser imediato.
          </p>
          <p>
            11.3. Encerrado o contrato, aplicam-se as regras de devolução/eliminação
            de dados previstas no DPA. Você pode solicitar a exportação dos dados
            antes do encerramento.
          </p>
        </Section>

        <Section title="12. Alterações">
          <p>
            Podemos alterar estes Termos, comunicando por meios razoáveis (ex.:
            e-mail ou aviso na Plataforma). O uso continuado após a vigência da
            alteração implica concordância.
          </p>
        </Section>

        <Section title="13. Disposições gerais">
          <p>
            13.1. A tolerância quanto a qualquer descumprimento não implica renúncia
            de direitos.
          </p>
          <p>13.2. A nulidade de uma cláusula não afeta as demais.</p>
          <p>
            13.3. Estes Termos regem-se pelas leis brasileiras. Fica eleito o foro da
            comarca de Ampére – PR, com renúncia a qualquer outro.
          </p>
        </Section>

        <Section title="14. Contato">
          <p>
            Dúvidas sobre estes Termos podem ser encaminhadas para o e-mail{' '}
            <strong>ba2vendasml@gmail.com</strong>. Consulte também nossa{' '}
            <a href="/privacidade" className="text-primary underline">
              Política de Privacidade
            </a>{' '}
            e a página de{' '}
            <a href="/exclusao-de-dados" className="text-primary underline">
              Exclusão de Dados
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
