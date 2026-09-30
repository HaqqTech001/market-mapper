-- Tighten notification creation: clients must not be able to create arbitrary notifications for arbitrary users.
DROP POLICY IF EXISTS "authorized notifications create" ON public.notifications;
CREATE POLICY "admins create notifications" ON public.notifications FOR INSERT TO authenticated
 WITH CHECK (public.current_user_is_active() AND public.is_admin());

CREATE OR REPLACE FUNCTION public.create_mission_notification(
 target_user_id uuid, notification_id text, notification_type text, notification_title text,
 notification_body text, reference_type text DEFAULT NULL, reference_id text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth AS $$
DECLARE mission_uuid uuid;
BEGIN
 IF NOT public.current_user_is_active() THEN RAISE EXCEPTION 'inactive account'; END IF;
 IF reference_type <> 'handover' THEN RAISE EXCEPTION 'unsupported client notification'; END IF;
 SELECT h.mission_id INTO mission_uuid FROM public.handovers h WHERE h.id=reference_id
   AND (h.from_user_id=auth.uid() OR h.to_user_id=auth.uid()) AND target_user_id IN (h.from_user_id,h.to_user_id);
 IF mission_uuid IS NULL OR NOT public.is_mission_member(mission_uuid) THEN RAISE EXCEPTION 'not authorized'; END IF;
 INSERT INTO public.notifications(id,recipient_id,type,title,body,entity_reference_type,entity_reference_id,is_read,created_at)
 VALUES(notification_id,target_user_id,notification_type,notification_title,notification_body,reference_type,reference_id,false,now())
 ON CONFLICT(id) DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.create_mission_notification(uuid,text,text,text,text,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_mission_notification(uuid,text,text,text,text,text,text) TO authenticated;
