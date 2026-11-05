// /admin/configuracoes → seção padrão: Pagamentos
import { redirect } from 'next/navigation';

export default function ConfiguracoesIndex() {
  redirect('/admin/configuracoes/pagamentos');
}
