// Generated connection metadata only: no files, network or agent context.
const headers = process.env.ARKIV_TELEMETRY === 'off' ? {} : {'X-Arkiv-Client': 'arkiv-plugin/0.5.1; host=claude-code'};
if (process.env.ARKIV_AUDIENCE === 'internal') headers['X-Arkiv-Audience'] = 'internal';
process.stdout.write(JSON.stringify(headers) + '\n');
