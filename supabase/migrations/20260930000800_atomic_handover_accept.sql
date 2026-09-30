-- Atomic handover acceptance with stale-assignment protection.
CREATE OR REPLACE FUNCTION public.accept_handover_atomic(target_handover_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE h public.handovers%ROWTYPE; a public.mission_area_assignments%ROWTYPE;
BEGIN
 SELECT * INTO h FROM public.handovers WHERE id=target_handover_id FOR UPDATE;
 IF h.id IS NULL THEN RAISE EXCEPTION 'handover not found'; END IF;
 IF NOT public.current_user_is_active() OR auth.uid()<>h.to_user_id THEN RAISE EXCEPTION 'not authorized'; END IF;
 IF h.status<>'pending' THEN RETURN jsonb_build_object('accepted',false,'status',h.status); END IF;
 SELECT * INTO a FROM public.mission_area_assignments WHERE mission_id=h.mission_id AND area_id=h.area_id FOR UPDATE;
 IF a.id IS NULL THEN UPDATE public.handovers SET status='stale',updated_at=now() WHERE id=h.id; RETURN jsonb_build_object('accepted',false,'status','stale','reason','assignment_missing'); END IF;
 IF COALESCE(a.assigned_to_user_id,a.user_id)<>h.from_user_id AND COALESCE(a.assigned_to_user_id,a.user_id)<>h.to_user_id THEN
   UPDATE public.handovers SET status='stale',updated_at=now() WHERE id=h.id; RETURN jsonb_build_object('accepted',false,'status','stale','reason','assignment_changed');
 END IF;
 UPDATE public.mission_area_assignments SET assigned_to_user_id=h.to_user_id,user_id=h.to_user_id,status='assigned',assigned_at=now() WHERE id=a.id;
 UPDATE public.handovers SET status='accepted',updated_at=now() WHERE id=h.id;
 RETURN jsonb_build_object('accepted',true,'status','accepted');
END $$;
REVOKE ALL ON FUNCTION public.accept_handover_atomic(text) FROM public;
GRANT EXECUTE ON FUNCTION public.accept_handover_atomic(text) TO authenticated;
