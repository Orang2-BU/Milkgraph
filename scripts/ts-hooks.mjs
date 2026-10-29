// Hook resolver Node untuk skrip: alias "@/..." ke akar projek dan impor tanpa ekstensi ke file .ts.
const ROOT = new URL("../", import.meta.url);

export async function resolve(specifier, context, next) {
  const spec = specifier.startsWith("@/") ? new URL(specifier.slice(2), ROOT).href : specifier;
  try {
    return await next(spec, context);
  } catch (error) {
    if ((spec.startsWith(".") || spec.startsWith("file:")) && !/\.\w+$/.test(spec)) return next(`${spec}.ts`, context);
    throw error;
  }
}
