/**
 * supabase_config.js — إعدادات الاتصال بقاعدة بيانات Supabase
 * منصة الخيميائي في العلوم - أ. مينا جرجس
 */

window.MENA_SUPABASE_CONFIG = {
  // 🔑 بيانات مشروع Supabase الخاص بمستر مينا:
  // يمكن كتابتها هنا مباشرة، أو حفظها عبر واجهة الإعدادات السريعة في المتصفح
  DEFAULT_URL: 'https://omsutcvoukueqxcxleah.supabase.co', // رابط مشروع مستر مينا من Supabase
  DEFAULT_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tc3V0Y3ZvdWt1ZXF4Y3hsZWFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyMzU0NTEsImV4cCI6MjEwNTgxMTQ1MX0.YjZuR6-WLhhPO1W5bEn-Xs6hOLsdpgCt4fWrIWZ82zg',

  getUrl() {
    const stored = localStorage.getItem('mena_supabase_url');
    if (stored && stored.includes('supabase.co') && !stored.includes('vugmrmvjtwphvymzoxlh')) return stored;
    return this.DEFAULT_URL;
  },

  getAnonKey() {
    const stored = localStorage.getItem('mena_supabase_anon_key');
    if (stored && !stored.includes('dummy_anon_key')) return stored;
    return this.DEFAULT_ANON_KEY;
  },

  setConfig(url, key) {
    if (url) localStorage.setItem('mena_supabase_url', url.trim());
    if (key) localStorage.setItem('mena_supabase_anon_key', key.trim());
    window._menaSupabaseClient = null; // Reset cached client
    return true;
  },

  isConfigured() {
    const url = this.getUrl();
    const key = this.getAnonKey();
    return url && key && !key.includes('dummy_anon_key');
  }
};

/**
 * الحصول على عميل Supabase الموحد
 */
window.getSupabaseClient = function() {
  if (window._menaSupabaseClient) {
    return window._menaSupabaseClient;
  }

  const url = window.MENA_SUPABASE_CONFIG.getUrl();
  const anonKey = window.MENA_SUPABASE_CONFIG.getAnonKey();

  if (window.supabase && typeof window.supabase.createClient === 'function') {
    try {
      window._menaSupabaseClient = window.supabase.createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      return window._menaSupabaseClient;
    } catch (e) {
      console.warn("Supabase client init error:", e);
      return null;
    }
  } else {
    console.warn("Supabase JS library not loaded yet.");
    return null;
  }
};
