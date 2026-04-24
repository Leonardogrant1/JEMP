-- Allow authenticated users to call the snapshot functions via RPC
GRANT EXECUTE ON FUNCTION fn_take_category_level_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION fn_take_user_category_level_snapshot(uuid) TO authenticated;
