export function formatMoney(amount: number | null | undefined): string {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount || 0);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateCard(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString('es-PE', { month: 'short' }).replace('.', '')} ${d.getDate()}, ${d.getFullYear()}`;
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Hace ${Math.max(1, mins)} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} hora${hrs > 1 ? 's' : ''}`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} dia${days > 1 ? 's' : ''}`;
}

export function seatLabel(b: { zona: string; fila?: string; asiento?: string }): string {
  if (b.fila && b.asiento) return `${b.zona} · Fila ${b.fila} · Asiento ${b.asiento}`;
  return `${b.zona} · Entrada general`;
}

export function roleLabel(rol: string): string {
  return ({ admin: 'Administrador', organizador: 'Organizador', usuario: 'Usuario' } as Record<string, string>)[rol] || rol;
}

export const CATEGORY_LABEL: Record<string, string> = {
  concierto: 'CONCIERTOS',
  festival: 'FESTIVALES',
  teatro: 'TEATRO',
  deporte: 'DEPORTE',
  otro: 'OTROS',
};
