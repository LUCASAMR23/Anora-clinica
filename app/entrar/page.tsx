/* eslint-disable @next/next/no-img-element */
import { chatGPTSignInPath, getChatGPTUser } from "../chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const identity = await getChatGPTUser();
  return <main className="login-page"><section className="login-panel"><div className="login-brand"><img className="login-logo" src="/anora-logo.png" alt="Anora Clínica"/></div><div className="login-copy"><p className="login-kicker">ACESSO PROTEGIDO</p><h1>Controle seguro para cada viagem.</h1><p>Estoque, malas e relatórios clínicos em um ambiente privado e rastreável.</p></div><div className="login-features"><span>✓ Dados protegidos</span><span>✓ Histórico de estoque</span><span>✓ Acesso por função</span></div></section><section className="login-card"><div><p className="login-kicker">BEM-VINDA</p><h2>Entrar no sistema</h2><p>{identity ? "Sua conta autorizada já foi reconhecida. Você pode continuar para o painel." : "Use a conta autorizada para a clínica. Somente pessoas liberadas pela administradora podem acessar."}</p></div><a href={identity ? "/?view=painel" : chatGPTSignInPath("/?view=painel")} target={identity ? undefined : "_top"} className="button login-button">{identity ? "Continuar para o painel" : "Entrar com conta autorizada"}</a><p className="login-note">O acesso é protegido pela sua conta autorizada; não existe senha salva ou visível dentro da Anora.</p></section></main>;
}
