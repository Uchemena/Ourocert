-- Migration 014: Keep recipient_count in sync with actual certificate rows
-- A trigger fires on every INSERT or DELETE on certificates and updates
-- the parent batch's recipient_count to the true row count.

CREATE OR REPLACE FUNCTION public.sync_batch_recipient_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.batches
  SET recipient_count = (
    SELECT COUNT(*)
    FROM public.certificates
    WHERE batch_id = COALESCE(NEW.batch_id, OLD.batch_id)
  )
  WHERE id = COALESCE(NEW.batch_id, OLD.batch_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_recipient_count_on_insert
  AFTER INSERT ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.sync_batch_recipient_count();

CREATE TRIGGER sync_recipient_count_on_delete
  AFTER DELETE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.sync_batch_recipient_count();
