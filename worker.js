export default {
  async fetch(request, env, ctx) {
    return new Response("Worker 运行成功！", { 
      status: 200, 
      headers: { "Content-Type": "text/plain; charset=utf-8" } 
    });
  }
};