// 雲端同步層（沿用 v7.5.1 邏輯）：未設定 config.js 時自動退回本機模式。
(() => {
  const cfg = window.SUPABASE_CONFIG || {};
  const configured = !!(
    cfg.url && !String(cfg.url).includes('YOUR_') &&
    cfg.anonKey && !String(cfg.anonKey).includes('YOUR_')
  );
  const state = { configured, client: null, session: null };
  const listeners = [];

  function rowFromRecord(record) {
    if (!state.session) return null;
    return {
      user_id: state.session.user.id,
      client_id: String(record.id),
      record_created_at: record.createdAt || new Date().toISOString(),
      assessment_date: record.date,
      learner_code: record.learnerCode,
      care_population: record.care || 'adult',
      assessment_tool: record.tool,
      assessment_item: record.item,
      assessment_rating: record.rating || null,
      observed_behavior: record.observedBehavior,
      selected_components: record.components || [],
      feedback: record.feedback,
      take_home_message: record.takeHome || null,
      schema_version: record.schemaVersion || '7.6'
    };
  }

  window.rtCloud = {
    configured,
    getSession: () => state.session,
    onAuthChange(fn) {
      listeners.push(fn);
      if (state.session !== undefined) fn(state.session);
    },
    async signInWithGoogle() {
      if (!state.client) return { ok: false, error: '尚未設定 Supabase' };
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await state.client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    async signOut() {
      if (!state.client) return { ok: false, error: '尚未設定 Supabase' };
      const { error } = await state.client.auth.signOut();
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    async pushRecord(record) {
      if (!state.client || !state.session) return { ok: false, error: '尚未登入' };
      const { error } = await state.client
        .from('feedback_records')
        .upsert(rowFromRecord(record), { onConflict: 'user_id,client_id' });
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    async pushMany(records) {
      if (!state.client || !state.session) return { ok: false, error: '尚未登入' };
      if (!records.length) return { ok: true, count: 0 };
      const rows = records.map(rowFromRecord).filter(Boolean);
      const { error } = await state.client
        .from('feedback_records')
        .upsert(rows, { onConflict: 'user_id,client_id' });
      return error ? { ok: false, error: error.message } : { ok: true, count: rows.length };
    },
    async deleteRecord(clientId) {
      if (!state.client || !state.session) return { ok: false, error: '尚未登入' };
      const { error } = await state.client
        .from('feedback_records')
        .delete()
        .eq('user_id', state.session.user.id)
        .eq('client_id', String(clientId));
      return error ? { ok: false, error: error.message } : { ok: true };
    },
    async pullRecords() {
      if (!state.client || !state.session) return { ok: false, error: '尚未登入' };
      const { data, error } = await state.client
        .from('feedback_records')
        .select('*')
        .eq('user_id', state.session.user.id)
        .order('record_created_at', { ascending: false });
      if (error) return { ok: false, error: error.message };
      const records = (data || []).map(row => ({
        id: row.client_id,
        createdAt: row.record_created_at,
        date: row.assessment_date,
        learnerCode: row.learner_code,
        care: row.care_population,
        tool: row.assessment_tool,
        item: row.assessment_item,
        rating: row.assessment_rating || '',
        observedBehavior: row.observed_behavior,
        components: Array.isArray(row.selected_components) ? row.selected_components : [],
        feedback: row.feedback,
        takeHome: row.take_home_message || '',
        schemaVersion: row.schema_version || '7.6'
      }));
      return { ok: true, records };
    }
  };

  if (!configured || typeof supabase === 'undefined' || !supabase.createClient) return;

  state.client = supabase.createClient(cfg.url, cfg.anonKey);
  state.client.auth.getSession().then(({ data }) => {
    state.session = data.session || null;
    listeners.forEach(fn => fn(state.session));
  });
  state.client.auth.onAuthStateChange((_event, session) => {
    state.session = session;
    listeners.forEach(fn => fn(state.session));
  });
})();
