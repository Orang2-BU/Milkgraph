export const number = (value: number) => new Intl.NumberFormat("id-ID").format(value);
export const money = (value: number) => `Rp ${number(value)}`;
export const time = (offset: number) => `${String(13 + Math.floor(offset / 60)).padStart(2, "0")}.${String(offset % 60).padStart(2, "0")}`;
export const duration = (minutes: number) => `${Math.floor(minutes / 60)}j ${minutes % 60}m`;
