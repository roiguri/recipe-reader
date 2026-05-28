-- Auto-extracted from Supabase cluster backup
-- Source: db_cluster-15-09-2025@22-39-20.backup.gz
-- Extracted on 2026-05-28
-- Contents: public-schema DDL only (tables, functions, policies, triggers,
-- indexes, sequences). No data, no roles, no auth/storage internals,
-- no session tokens. Run this on a fresh Supabase project to recreate
-- the demo-frontend schema.

--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: create_rate_limit_for_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_rate_limit_for_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Insert the rate limit record with correct column names
  INSERT INTO public.demo_rate_limits (user_id, requests_used, requests_limit)
  VALUES (NEW.id, 0, 5)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log the error details for debugging
    RAISE LOG 'Failed to create demo_rate_limits for user %: % %', NEW.id, SQLSTATE, SQLERRM;
    -- Don't fail the user creation, just return NEW
    RETURN NEW;
END;
$$;



--
-- Name: increment_rate_limit(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.increment_rate_limit(target_user_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  -- Atomically increment the requests_used counter
  UPDATE demo_rate_limits 
  SET 
    requests_used = requests_used + 1,
    updated_at = NOW()
  WHERE user_id = target_user_id;
  
  -- If no row was updated, the user doesn't have a rate limit record yet
  -- This shouldn't happen as we create the record before checking limits
  IF NOT FOUND THEN
    INSERT INTO demo_rate_limits (user_id, requests_used, requests_limit)
    VALUES (target_user_id, 1, 5);
  END IF;
END;
$$;



--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;



--
-- Name: demo_rate_limits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.demo_rate_limits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    requests_used integer DEFAULT 0 NOT NULL,
    requests_limit integer DEFAULT 5 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_reset timestamp with time zone DEFAULT now() NOT NULL
);



--
-- Name: user_recipes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_recipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    source_type text NOT NULL,
    source_data text NOT NULL,
    processed_recipe jsonb NOT NULL,
    title text,
    confidence_score numeric(5,4),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    recipe_status text DEFAULT 'saved'::text,
    processed_at timestamp with time zone DEFAULT now(),
    extraction_error text,
    retry_count integer DEFAULT 0,
    CONSTRAINT user_recipes_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric))),
    CONSTRAINT user_recipes_recipe_status_check CHECK ((recipe_status = ANY (ARRAY['saved'::text, 'processed'::text, 'shared'::text, 'processing'::text, 'failed'::text]))),
    CONSTRAINT user_recipes_source_type_check CHECK ((source_type = ANY (ARRAY['text'::text, 'url'::text, 'image'::text])))
);



--
-- Name: COLUMN user_recipes.recipe_status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_recipes.recipe_status IS 'Tracks the processing status of the recipe';


--
-- Name: COLUMN user_recipes.processed_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_recipes.processed_at IS 'Timestamp when recipe was last processed';


--
-- Name: COLUMN user_recipes.extraction_error; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_recipes.extraction_error IS 'Error message if processing failed';


--
-- Name: COLUMN user_recipes.retry_count; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_recipes.retry_count IS 'Number of retry attempts for failed processing';


--
-- Name: demo_rate_limits demo_rate_limits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demo_rate_limits
    ADD CONSTRAINT demo_rate_limits_pkey PRIMARY KEY (id);


--
-- Name: demo_rate_limits demo_rate_limits_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demo_rate_limits
    ADD CONSTRAINT demo_rate_limits_user_id_key UNIQUE (user_id);


--
-- Name: user_recipes user_recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_recipes
    ADD CONSTRAINT user_recipes_pkey PRIMARY KEY (id);


--
-- Name: idx_demo_rate_limits_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_demo_rate_limits_user_id ON public.demo_rate_limits USING btree (user_id);


--
-- Name: idx_user_recipes_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_recipes_created_at ON public.user_recipes USING btree (created_at DESC);


--
-- Name: idx_user_recipes_processed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_recipes_processed_at ON public.user_recipes USING btree (user_id, processed_at DESC);


--
-- Name: idx_user_recipes_source_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_recipes_source_type ON public.user_recipes USING btree (source_type);


--
-- Name: idx_user_recipes_source_url; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_recipes_source_url ON public.user_recipes USING btree (user_id, source_data) WHERE (source_type = 'url'::text);


--
-- Name: idx_user_recipes_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_recipes_status ON public.user_recipes USING btree (user_id, recipe_status);


--
-- Name: idx_user_recipes_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_recipes_user_id ON public.user_recipes USING btree (user_id);


--
-- Name: demo_rate_limits update_demo_rate_limits_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_demo_rate_limits_updated_at BEFORE UPDATE ON public.demo_rate_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_recipes update_user_recipes_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_recipes_updated_at BEFORE UPDATE ON public.user_recipes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: demo_rate_limits demo_rate_limits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.demo_rate_limits
    ADD CONSTRAINT demo_rate_limits_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_recipes user_recipes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_recipes
    ADD CONSTRAINT user_recipes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: demo_rate_limits Admins can manage all rate limits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all rate limits" ON public.demo_rate_limits USING ((COALESCE((((auth.jwt() -> 'app_metadata'::text) -> 'is_admin'::text))::boolean, false) = true));


--
-- Name: user_recipes Admins can manage all recipes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Admins can manage all recipes" ON public.user_recipes USING ((COALESCE((((auth.jwt() -> 'app_metadata'::text) -> 'is_admin'::text))::boolean, false) = true));


--
-- Name: demo_rate_limits Service role can manage all rate limits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage all rate limits" ON public.demo_rate_limits USING (((auth.jwt() ->> 'role'::text) = 'service_role'::text));


--
-- Name: user_recipes Users can manage own recipes; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can manage own recipes" ON public.user_recipes USING ((auth.uid() = user_id));


--
-- Name: demo_rate_limits Users can view own rate limits; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view own rate limits" ON public.demo_rate_limits FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: demo_rate_limits; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.demo_rate_limits ENABLE ROW LEVEL SECURITY;

--
-- Name: user_recipes; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;

