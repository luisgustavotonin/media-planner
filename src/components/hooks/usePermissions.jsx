export function usePermissions(user, profile) {
  if (!user || !profile) {
    return {
      visualizar_dashboard: false,
      visualizar_clientes: false,
      editar_clientes: false,
      visualizar_planos: false,
      editar_planos: false,
      exportar_pdf: false,
      visualizar_planejamento_reverso: false,
      editar_planejamento_reverso: false,
      visualizar_simulador_cenarios: false,
      editar_simulador_cenarios: false,
      visualizar_acompanhamento_semanal: false,
      editar_acompanhamento_semanal: false,
      visualizar_usuarios: false,
      gerenciar_usuarios: false,
      visualizar_benchmarks: false,
      gerenciar_benchmarks: false,
    };
  }
  
  // Admin tem acesso total
  if (user.role === 'admin') {
    return {
      visualizar_dashboard: true,
      visualizar_clientes: true,
      editar_clientes: true,
      visualizar_planos: true,
      editar_planos: true,
      exportar_pdf: true,
      visualizar_planejamento_reverso: true,
      editar_planejamento_reverso: true,
      visualizar_simulador_cenarios: true,
      editar_simulador_cenarios: true,
      visualizar_acompanhamento_semanal: true,
      editar_acompanhamento_semanal: true,
      visualizar_usuarios: true,
      gerenciar_usuarios: true,
      visualizar_benchmarks: true,
      gerenciar_benchmarks: true,
    };
  }
  
  // Consultor/Client segue perfil
  return profile.permissions || {};
}