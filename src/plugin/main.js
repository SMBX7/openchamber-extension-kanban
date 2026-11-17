// The agent's entry into OpenCode.
//
// OpenChamber lists this folder in the OpenCode config it owns, while the
// extension is active and approved, so nobody writes a path and an update
// cannot leave one stale: the folder is the installed package's own. OpenCode
// imports it with a bare `import()`; the default export is the plain
// `{ id, setup }` object, which is why nothing outside Node is imported here.
import { AGENT_TOOLS, callAgentTool } from '../shared/agent-tools.js';
import { writeAgentHeartbeat } from '../shared/agent-config.js';

const NAMESPACE = 'kanban';

// `kanban_create_card` becomes namespace `kanban` + name `create_card`: the
// effective tool name is the one the agent already knows.
const shortName = (name) => (name.startsWith(`${NAMESPACE}_`) ? name.slice(NAMESPACE.length + 1) : name);

const projectOf = async (ctx, sessionID) => {
  try {
    const session = await ctx.session.get({ sessionID });
    const directory = session?.location?.directory;
    if (typeof directory === 'string' && directory) {
      const subpath = typeof session?.subpath === 'string' ? session.subpath : '';
      return subpath ? `${directory.replace(/\/+$/, '')}/${subpath.replace(/^\/+/, '')}` : directory;
    }
  } catch {
    // Fall through to the instance location: a tool call must not fail because
    // the session could not be read.
  }
  return typeof ctx.location?.directory === 'string' ? ctx.location.directory : '';
};

export default {
  id: 'kanban',
  async setup(ctx) {
    writeAgentHeartbeat({ location: ctx.location?.directory, event: 'setup' });
    await ctx.tool.transform((editor) => {
      editor.namespace({ name: NAMESPACE, description: 'Kanban board of the project this session belongs to' });
      for (const tool of AGENT_TOOLS) {
        editor.add({
          name: shortName(tool.name),
          description: tool.description,
          input: tool.inputSchema,
          options: { namespace: NAMESPACE, codemode: true },
          execute: async (input, context) => {
            const directory = await projectOf(ctx, context.sessionID);
            const text = await callAgentTool(tool.name, input || {}, {
              directory,
              sessionId: context.sessionID,
            });
            // Cheap proof that the agent is on this build, without a second look
            // at the config: a tool call that worked came from this code.
            writeAgentHeartbeat({ location: directory, event: tool.name });
            return { content: text };
          },
        });
      }
    });
  },
};
