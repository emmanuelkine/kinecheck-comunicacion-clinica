create index if not exists platform_case_events_owner_idx
  on public.platform_case_events(owner_id);

alter policy "read own progress" on public.learning_progress
  to authenticated
  using ((select auth.uid()) = user_id);

alter policy "insert own progress" on public.learning_progress
  to authenticated
  with check ((select auth.uid()) = user_id);

alter policy "update own progress" on public.learning_progress
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

alter policy "Users can read their own reviews" on public.course_reviews
  using ((select auth.uid()) = user_id);

alter policy "platform_cases_select_own" on public.platform_cases
  using (owner_id = (select auth.uid()));

alter policy "platform_cases_insert_own" on public.platform_cases
  with check (owner_id = (select auth.uid()));

alter policy "platform_cases_update_own" on public.platform_cases
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

alter policy "platform_cases_delete_own" on public.platform_cases
  using (owner_id = (select auth.uid()));

alter policy "platform_case_events_select_own" on public.platform_case_events
  using (owner_id = (select auth.uid()));

alter policy "platform_preferences_select_own" on public.platform_user_preferences
  using (user_id = (select auth.uid()));

alter policy "platform_preferences_insert_own" on public.platform_user_preferences
  with check (user_id = (select auth.uid()));

alter policy "platform_preferences_update_own" on public.platform_user_preferences
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
