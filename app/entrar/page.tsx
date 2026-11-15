/* eslint-disable @next/next/no-img-element */
import { redirect } from "next/navigation";
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const identity = await getChatGPTUser();
  if (identity) redirect("/?view=painel");
  return <main className="login-page"><section className="login-panel"><div className="login-brand"><img className="login-logo" src="/anora-logo.png" alt="Anora Clínica"/></div><div className="login-copy"><p className="login-kicker">ACESSO PROTEGIDO</p><h1>Controle seguro para cada viagem.</h1><p>Estoque, malas e relatórios clínicos em um ambiente privado e rastreável.</p></div><div className="login-features"><span>✓ Dados protegidos</span><span>✓ Histórico de estoque</span><span>✓ Acesso por função</span></div></section><section className="login-card"><div><p className="login-kicker">BEM-VINDA</p><h2>Entrar no sistema</h2><p>Use a conta autorizada para a clínica. Somente pessoas liberadas pela administradora podem acessar.</p></div><a href={chatGPTSignInPath("/?view=painel")} target="_top" className="button login-button">Entrar com conta autorizada</a><p className="login-note">Não há senha salva no sistema. A identificação é realizada com segurança pela plataforma de acesso.</p></section></main>;
}
