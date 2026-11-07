export const number = (value: number) => new Intl.NumberFormat("id-ID").format(value);
export const money = (value: number) => `Rp ${number(value)}`;
export const time = (offset: number) => `${String(13 + Math.floor(offset / 60)).padStart(2, "0")}.${String(offset % 60).padStart(2, "0")}`;
export const duration = (minutes: number) => { const h = Math.floor(minutes / 60), m = minutes % 60; return h && m ? `${h} jam ${m} menit` : h ? `${h} jam` : `${m} menit`; };
