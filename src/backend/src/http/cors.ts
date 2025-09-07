export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
};

export const jsonHeaders = {
  ...corsHeaders,
  'Content-Type': 'application/json; charset=utf-8',
};
