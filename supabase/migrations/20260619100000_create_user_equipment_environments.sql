-- Required for the composite FK in user_equipment_environments
ALTER TABLE user_equipments
    ADD CONSTRAINT user_equipments_user_id_equipment_id_key UNIQUE (user_id, equipment_id);

CREATE TABLE IF NOT EXISTS user_equipment_environments (
    user_id        UUID NOT NULL,
    equipment_id   UUID NOT NULL,
    environment_id UUID NOT NULL,
    CONSTRAINT user_equipment_environments_pkey
        PRIMARY KEY (user_id, equipment_id, environment_id),
    CONSTRAINT user_equipment_environments_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE,
    CONSTRAINT user_equipment_environments_equipment_id_fkey
        FOREIGN KEY (equipment_id) REFERENCES equipments(id) ON DELETE CASCADE,
    CONSTRAINT user_equipment_environments_environment_id_fkey
        FOREIGN KEY (environment_id) REFERENCES environments(id) ON DELETE CASCADE,
    CONSTRAINT user_equipment_environments_user_id_equipment_id_fkey
        FOREIGN KEY (user_id, equipment_id) REFERENCES user_equipments(user_id, equipment_id) ON DELETE CASCADE
);

ALTER TABLE user_equipment_environments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own equipment environments"
    ON user_equipment_environments
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
