-- Add youtube_url to exercises based on slug

UPDATE exercises SET youtube_url = CASE slug
    -- Plyometrics / Jumps
    WHEN 'box_jump' THEN 'https://www.youtube.com/watch?v=52lowfl_tSI'
    WHEN 'depth_jump' THEN 'https://www.youtube.com/watch?v=XPdDaVTGmSg'
    WHEN 'broad_jump' THEN 'https://www.youtube.com/watch?v=ADGRHtAFDhU'
    WHEN 'single_leg_box_jump' THEN 'https://www.youtube.com/watch?v=vDBM_lQ8FOA'
    WHEN 'lateral_bounds' THEN 'https://www.youtube.com/watch?v=VGFe3fETwJQ'
    WHEN 'hurdle_hops' THEN 'https://www.youtube.com/watch?v=RM_mDVu7J4w'
    WHEN 'tuck_jump' THEN 'https://www.youtube.com/watch?v=ip55-2uMqXI'
    WHEN 'drop_jump' THEN 'https://www.youtube.com/watch?v=XPdDaVTGmSg'
    WHEN 'pogos' THEN 'https://www.youtube.com/watch?v=pfMmwb09W18'
    WHEN 'lateral_hurdle_hop' THEN 'https://www.youtube.com/watch?v=KDO01l_FGWU'
    WHEN 'jump_squat' THEN 'https://www.youtube.com/watch?v=CVaEhXotL7M'
    WHEN 'squat_jump_to_stick' THEN 'https://www.youtube.com/watch?v=CVaEhXotL7M'
    WHEN 'skater_jump' THEN 'https://www.youtube.com/watch?v=V7pCFCa5YkI'
    WHEN 'star_jump' THEN 'https://www.youtube.com/watch?v=9KE3fBWBIq8'

    -- Olympic lifts
    WHEN 'power_clean' THEN 'https://www.youtube.com/watch?v=_iCqBGcCpMg'
    WHEN 'hang_power_clean' THEN 'https://www.youtube.com/watch?v=vhJ0UGwBfik'
    WHEN 'power_snatch' THEN 'https://www.youtube.com/watch?v=tuOiNeTvlJs'
    WHEN 'hang_power_snatch' THEN 'https://www.youtube.com/watch?v=9xQp2sldgOo'
    WHEN 'push_press' THEN 'https://www.youtube.com/watch?v=iaBVSJm78ko'

    -- Squat / Deadlift
    WHEN 'back_squat' THEN 'https://www.youtube.com/watch?v=ultWZbUMPL8'
    WHEN 'front_squat' THEN 'https://www.youtube.com/watch?v=m4ytaCJZpl0'
    WHEN 'trap_bar_deadlift' THEN 'https://www.youtube.com/watch?v=dfo5OGqFxNY'
    WHEN 'conventional_deadlift' THEN 'https://www.youtube.com/watch?v=op9kVnSso6Q'
    WHEN 'sumo_deadlift' THEN 'https://www.youtube.com/watch?v=oPKAmMkPKoE'
    WHEN 'romanian_deadlift' THEN 'https://www.youtube.com/watch?v=7j-2GC1hCGA'
    WHEN 'stiff_leg_deadlift' THEN 'https://www.youtube.com/watch?v=1uDiW5--rAE'
    WHEN 'hip_thrust' THEN 'https://www.youtube.com/watch?v=xDmFkJxPzeM'
    WHEN 'bulgarian_split_squat' THEN 'https://www.youtube.com/watch?v=2C-uNgKwPLE'
    WHEN 'single_leg_rdl' THEN 'https://www.youtube.com/watch?v=iDZMkQCaI_o'
    WHEN 'step_up' THEN 'https://www.youtube.com/watch?v=dQqApCGd5Ss'
    WHEN 'reverse_lunge' THEN 'https://www.youtube.com/watch?v=xrjBbIkAUTE'
    WHEN 'goblet_squat' THEN 'https://www.youtube.com/watch?v=MeIiIdhvXT4'
    WHEN 'cossack_squat' THEN 'https://www.youtube.com/watch?v=tpczTeSkHz0'
    WHEN 'wall_sit' THEN 'https://www.youtube.com/watch?v=y-wV4Venusw'
    WHEN 'deep_squat_hold' THEN 'https://www.youtube.com/watch?v=jCIDUfU9LYA'
    WHEN 'bodyweight_squat' THEN 'https://www.youtube.com/watch?v=aclHkVaku9U'
    WHEN 'pistol_squat' THEN 'https://www.youtube.com/watch?v=vq5-vdgJc0I'
    WHEN 'assisted_pistol_squat' THEN 'https://www.youtube.com/watch?v=4OQV4Y6ODNU'
    WHEN 'split_squat' THEN 'https://www.youtube.com/watch?v=U4s4mEQ5VOU'
    WHEN 'walking_lunge' THEN 'https://www.youtube.com/watch?v=L8fvypPrzzs'
    WHEN 'lateral_lunge' THEN 'https://www.youtube.com/watch?v=cFGtBcVl3g0'
    WHEN 'sumo_squat' THEN 'https://www.youtube.com/watch?v=lEMOiUo74L4'
    WHEN 'banded_squat' THEN 'https://www.youtube.com/watch?v=3R8PQF7XJOE'

    -- Hamstring / Posterior chain
    WHEN 'nordic_hamstring_curl' THEN 'https://www.youtube.com/watch?v=D2mGcwFkq4s'
    WHEN 'single_leg_calf_raise' THEN 'https://www.youtube.com/watch?v=YMmgqO8-i4E'
    WHEN 'tibialis_raise' THEN 'https://www.youtube.com/watch?v=SiP6-1CUJBY'
    WHEN 'reverse_hyperextension' THEN 'https://www.youtube.com/watch?v=3jH-B0LhsMM'
    WHEN 'back_extension_45deg' THEN 'https://www.youtube.com/watch?v=ph3pddpKzzw'
    WHEN 'wall_supported_hamstring_curl' THEN 'https://www.youtube.com/watch?v=D2mGcwFkq4s'
    WHEN 'calf_raise_bilateral' THEN 'https://www.youtube.com/watch?v=gwLzBJYoWlI'

    -- Glute activation
    WHEN 'glute_bridge' THEN 'https://www.youtube.com/watch?v=OUgsJ8-Vi0E'
    WHEN 'single_leg_glute_bridge' THEN 'https://www.youtube.com/watch?v=il8CuRtfmMc'
    WHEN 'banded_monster_walk' THEN 'https://www.youtube.com/watch?v=ZE7WdBLIDeI'
    WHEN 'lateral_band_walk' THEN 'https://www.youtube.com/watch?v=Y9tpiSEpNAo'
    WHEN 'banded_clamshell' THEN 'https://www.youtube.com/watch?v=HXm5HPeAnhU'
    WHEN 'banded_hip_thrust' THEN 'https://www.youtube.com/watch?v=xDmFkJxPzeM'
    WHEN 'donkey_kick' THEN 'https://www.youtube.com/watch?v=SJ1Xuz9D-ZQ'
    WHEN 'fire_hydrant' THEN 'https://www.youtube.com/watch?v=rMT9JVPsf9M'
    WHEN 'standing_hip_abduction' THEN 'https://www.youtube.com/watch?v=cPVElMwjGJ0'
    WHEN 'standing_hip_extension' THEN 'https://www.youtube.com/watch?v=kDiEBNt9Y0A'
    WHEN 'banded_kickback' THEN 'https://www.youtube.com/watch?v=kDiEBNt9Y0A'

    -- Push
    WHEN 'bench_press' THEN 'https://www.youtube.com/watch?v=SCVCLChPQEs'
    WHEN 'incline_dumbbell_press' THEN 'https://www.youtube.com/watch?v=8iPEnn-ltC8'
    WHEN 'overhead_press' THEN 'https://www.youtube.com/watch?v=2yjwXTZQDDI'
    WHEN 'landmine_press' THEN 'https://www.youtube.com/watch?v=6owO-CcEbhU'
    WHEN 'push_up' THEN 'https://www.youtube.com/watch?v=IODxDxX7oi4'
    WHEN 'wide_grip_push_up' THEN 'https://www.youtube.com/watch?v=IODxDxX7oi4'
    WHEN 'diamond_push_up' THEN 'https://www.youtube.com/watch?v=J0DXoz9JrIE'
    WHEN 'decline_push_up' THEN 'https://www.youtube.com/watch?v=SKPab2YC8BE'
    WHEN 'archer_push_up' THEN 'https://www.youtube.com/watch?v=UMFQl9wajXA'
    WHEN 'pike_push_up' THEN 'https://www.youtube.com/watch?v=x7_I5SUAd00'
    WHEN 'explosive_push_up' THEN 'https://www.youtube.com/watch?v=4EGCrKArjgg'
    WHEN 'shoulder_tap_push_up' THEN 'https://www.youtube.com/watch?v=LEZq7QoSCgs'
    WHEN 'tricep_dip' THEN 'https://www.youtube.com/watch?v=2z8JmcrW-As'
    WHEN 'dumbbell_floor_press' THEN 'https://www.youtube.com/watch?v=3H_e2YFQBBE'
    WHEN 'banded_overhead_press' THEN 'https://www.youtube.com/watch?v=O5TAUV7aMI0'
    WHEN 'banded_lateral_raise' THEN 'https://www.youtube.com/watch?v=gJoLuCb03SE'
    WHEN 'banded_chest_press_floor' THEN 'https://www.youtube.com/watch?v=WvbewDgBDmQ'
    WHEN 'dumbbell_curl_to_press' THEN 'https://www.youtube.com/watch?v=nnVJxOsSpYc'

    -- Pull
    WHEN 'pull_up' THEN 'https://www.youtube.com/watch?v=eGo4IYlbE5g'
    WHEN 'chin_up' THEN 'https://www.youtube.com/watch?v=sIiArgNqmGo'
    WHEN 'weighted_pull_up' THEN 'https://www.youtube.com/watch?v=7-IvT5bikJo'
    WHEN 'barbell_row' THEN 'https://www.youtube.com/watch?v=FWJR5Ve8bnQ'
    WHEN 'dumbbell_row' THEN 'https://www.youtube.com/watch?v=DMo3HJoawmU'
    WHEN 'face_pull' THEN 'https://www.youtube.com/watch?v=rep-qVOkqgk'
    WHEN 'band_pull_apart' THEN 'https://www.youtube.com/watch?v=LBUfnmugKLw'
    WHEN 'scapular_pull_up' THEN 'https://www.youtube.com/watch?v=bLgBnpk4KUA'
    WHEN 'inverted_row' THEN 'https://www.youtube.com/watch?v=LZCoTSH4fLI'
    WHEN 'negative_pull_up' THEN 'https://www.youtube.com/watch?v=O3RjIsmkBfI'
    WHEN 'renegade_row' THEN 'https://www.youtube.com/watch?v=Zup6dqkMlPk'
    WHEN 'banded_row' THEN 'https://www.youtube.com/watch?v=N_6OWDJ_vIs'
    WHEN 'banded_face_pull' THEN 'https://www.youtube.com/watch?v=rep-qVOkqgk'
    WHEN 'banded_good_morning' THEN 'https://www.youtube.com/watch?v=lVzYOMJe3I8'
    WHEN 'banded_romanian_deadlift' THEN 'https://www.youtube.com/watch?v=7j-2GC1hCGA'
    WHEN 'dumbbell_hip_hinge_row' THEN 'https://www.youtube.com/watch?v=DMo3HJoawmU'

    -- Core
    WHEN 'plank' THEN 'https://www.youtube.com/watch?v=ASdvN_XEl_c'
    WHEN 'side_plank' THEN 'https://www.youtube.com/watch?v=wqzrb67Dwf8'
    WHEN 'dead_bug' THEN 'https://www.youtube.com/watch?v=4XLEnwUr1d8'
    WHEN 'bird_dog' THEN 'https://www.youtube.com/watch?v=wiFNA3sqjCA'
    WHEN 'ab_wheel_rollout' THEN 'https://www.youtube.com/watch?v=pnVPLMVjkAw'
    WHEN 'cable_chop' THEN 'https://www.youtube.com/watch?v=4sUGqGaEZMI'
    WHEN 'hanging_leg_raise' THEN 'https://www.youtube.com/watch?v=Pr1ieGZ5atk'
    WHEN 'pallof_press' THEN 'https://www.youtube.com/watch?v=AH_QZLm_0-s'
    WHEN 'copenhagen_plank' THEN 'https://www.youtube.com/watch?v=bnA9iP3RjBA'
    WHEN 'copenhagen_hip_adduction' THEN 'https://www.youtube.com/watch?v=bnA9iP3RjBA'
    WHEN 'hollow_body_hold' THEN 'https://www.youtube.com/watch?v=LlDNef_Ztsc'
    WHEN 'v_up' THEN 'https://www.youtube.com/watch?v=7UVgs18Y1P4'
    WHEN 'reverse_crunch' THEN 'https://www.youtube.com/watch?v=hyv14_1QMVA'
    WHEN 'bicycle_crunch' THEN 'https://www.youtube.com/watch?v=9FGilxCbdz8'
    WHEN 'superman_hold' THEN 'https://www.youtube.com/watch?v=cc6UVRS7PW4'
    WHEN 'mountain_climber' THEN 'https://www.youtube.com/watch?v=nmwgirgXLYM'
    WHEN 'spiderman_plank' THEN 'https://www.youtube.com/watch?v=LCI-FDtb_9Y'
    WHEN 'toe_touch_crunch' THEN 'https://www.youtube.com/watch?v=HuDLJOber7g'
    WHEN 'banded_bicycle' THEN 'https://www.youtube.com/watch?v=9FGilxCbdz8'

    -- Carries
    WHEN 'farmers_walk' THEN 'https://www.youtube.com/watch?v=rt17lmnaLSM'
    WHEN 'suitcase_carry' THEN 'https://www.youtube.com/watch?v=VWnQjWpMa6o'
    WHEN 'isometric_mid_thigh_pull' THEN 'https://www.youtube.com/watch?v=fwNBfOtVFgk'

    -- Sled / Sprint
    WHEN 'sled_push' THEN 'https://www.youtube.com/watch?v=5G-zBhxh6yw'
    WHEN 'sled_pull' THEN 'https://www.youtube.com/watch?v=xAz6WJGnDEA'
    WHEN 'resisted_sprint' THEN 'https://www.youtube.com/watch?v=KsLNKmZkECE'
    WHEN 'sprint_parachute_run' THEN 'https://www.youtube.com/watch?v=4cN-UjHQQ_Q'
    WHEN 'flying_20_sprint' THEN 'https://www.youtube.com/watch?v=JnhteHvOqiM'
    WHEN 'acceleration_sprint_10m' THEN 'https://www.youtube.com/watch?v=JnhteHvOqiM'
    WHEN 'prowler_push_sprint' THEN 'https://www.youtube.com/watch?v=5G-zBhxh6yw'
    WHEN 'sprint_start_blocks' THEN 'https://www.youtube.com/watch?v=mRLCu5dGFaQ'
    WHEN 'banded_sprint_resistance_run' THEN 'https://www.youtube.com/watch?v=KsLNKmZkECE'

    -- Sprint drills
    WHEN 'a_skip_drill' THEN 'https://www.youtube.com/watch?v=SovKy53__so'
    WHEN 'b_skip_drill' THEN 'https://www.youtube.com/watch?v=8LBMHxl56ts'
    WHEN 'high_knees' THEN 'https://www.youtube.com/watch?v=tx5rgpDAJRA'
    WHEN 'butt_kicks' THEN 'https://www.youtube.com/watch?v=K0naalfJxr0'
    WHEN 'wall_drill_march' THEN 'https://www.youtube.com/watch?v=9UBxuXSmOAw'
    WHEN 'banded_hip_flexor_march' THEN 'https://www.youtube.com/watch?v=B3WnT7BUXLY'

    -- Agility
    WHEN 'agility_ladder_ickey_shuffle' THEN 'https://www.youtube.com/watch?v=U3gNAUqaB8Y'
    WHEN 'agility_ladder_single_leg_hops' THEN 'https://www.youtube.com/watch?v=qVak38ligD0'
    WHEN 'pro_agility_shuttle' THEN 'https://www.youtube.com/watch?v=FMnA1yCFHHg'
    WHEN 't_drill' THEN 'https://www.youtube.com/watch?v=JHM8GQkPy2s'
    WHEN 'reactive_drop_catch' THEN 'https://www.youtube.com/watch?v=yZikaV3Cg04'

    -- Medicine ball
    WHEN 'medicine_ball_slam' THEN 'https://www.youtube.com/watch?v=VCkSFdtYqB8'
    WHEN 'rotational_med_ball_throw' THEN 'https://www.youtube.com/watch?v=n3sXSIJOB6I'
    WHEN 'med_ball_chest_pass' THEN 'https://www.youtube.com/watch?v=sGBhMxpFcO4'
    WHEN 'med_ball_overhead_throw' THEN 'https://www.youtube.com/watch?v=P-AXr1QXwjM'
    WHEN 'med_ball_scoop_toss' THEN 'https://www.youtube.com/watch?v=cNDLSN3hhFk'

    -- Dumbbell compound
    WHEN 'dumbbell_thruster' THEN 'https://www.youtube.com/watch?v=L219ltL15zk'
    WHEN 'dumbbell_snatch' THEN 'https://www.youtube.com/watch?v=kT8P9DVkMuM'
    WHEN 'dumbbell_clean' THEN 'https://www.youtube.com/watch?v=b3G1UXzNrV0'
    WHEN 'dumbbell_rdl' THEN 'https://www.youtube.com/watch?v=hCDzSR6bW10'
    WHEN 'dumbbell_lateral_lunge' THEN 'https://www.youtube.com/watch?v=cFGtBcVl3g0'
    WHEN 'dumbbell_step_up_to_press' THEN 'https://www.youtube.com/watch?v=dQqApCGd5Ss'
    WHEN 'dumbbell_swing' THEN 'https://www.youtube.com/watch?v=YSxHifyI6s8'
    WHEN 'dumbbell_goblet_reverse_lunge' THEN 'https://www.youtube.com/watch?v=xrjBbIkAUTE'

    -- Cardio / Conditioning
    WHEN 'jump_rope_standard' THEN 'https://www.youtube.com/watch?v=1BZM2LrOMg4'
    WHEN 'jump_rope_double_under' THEN 'https://www.youtube.com/watch?v=82Cu-gMkB6Q'
    WHEN 'burpee' THEN 'https://www.youtube.com/watch?v=TU8QYVW0gDU'
    WHEN 'burpee_broad_jump' THEN 'https://www.youtube.com/watch?v=8bNDpAJbBqI'
    WHEN 'bear_crawl' THEN 'https://www.youtube.com/watch?v=7FXPV0ggI34'
    WHEN 'lateral_shuffle' THEN 'https://www.youtube.com/watch?v=GZ3Lh7z-MhQ'
    WHEN 'shadow_boxing' THEN 'https://www.youtube.com/watch?v=_gG6bJ-MJ9k'
    WHEN 'jumping_jacks' THEN 'https://www.youtube.com/watch?v=c4DAnQ6DtF8'
    WHEN 'sprint_in_place' THEN 'https://www.youtube.com/watch?v=tx5rgpDAJRA'
    WHEN 'stair_sprint' THEN 'https://www.youtube.com/watch?v=HyE2Bm0VNWE'

    -- Mobility
    WHEN 'worlds_greatest_stretch' THEN 'https://www.youtube.com/watch?v=1GpGgGi1aTI'
    WHEN 'inchworm' THEN 'https://www.youtube.com/watch?v=g09N5ZSMQUA'
    WHEN 'hip_cars' THEN 'https://www.youtube.com/watch?v=LsBmX3RYVFE'
    WHEN 'shoulder_cars' THEN 'https://www.youtube.com/watch?v=RJxrSmJVeSo'
    WHEN 'ankle_cars' THEN 'https://www.youtube.com/watch?v=MNFNVk3jrW4'
    WHEN 'banded_ankle_distraction' THEN 'https://www.youtube.com/watch?v=7AaLMBGl3nU'
    WHEN 'hip_90_90_stretch' THEN 'https://www.youtube.com/watch?v=obbq2x5LNZM'
    WHEN 'hip_flexor_lunge_stretch' THEN 'https://www.youtube.com/watch?v=xk0qBFrPbNg'
    WHEN 'pigeon_pose' THEN 'https://www.youtube.com/watch?v=TBbqxCVqXk4'
    WHEN 'leg_swing_front_to_back' THEN 'https://www.youtube.com/watch?v=qInXJmStzKA'
    WHEN 'leg_swing_side_to_side' THEN 'https://www.youtube.com/watch?v=eH3hMGJGBoA'
    WHEN 'arm_circle' THEN 'https://www.youtube.com/watch?v=Qp0EpquvMUw'
    WHEN 'seated_hamstring_stretch' THEN 'https://www.youtube.com/watch?v=XhwHVWVx4ZM'
    WHEN 'standing_quad_stretch' THEN 'https://www.youtube.com/watch?v=LE1wCGp5eoM'
    WHEN 'kneeling_adductor_stretch' THEN 'https://www.youtube.com/watch?v=q2Z5q1nPKs8'
    WHEN 'doorway_chest_stretch' THEN 'https://www.youtube.com/watch?v=oJeq8jjJyeM'
    WHEN 'deep_squat_hold' THEN 'https://www.youtube.com/watch?v=jCIDUfU9LYA'

    -- Foam rolling
    WHEN 'thoracic_foam_roll' THEN 'https://www.youtube.com/watch?v=sMHHa_SWe2M'
    WHEN 'lat_foam_roll' THEN 'https://www.youtube.com/watch?v=aGCsmNLWoSE'
    WHEN 'quad_foam_roll' THEN 'https://www.youtube.com/watch?v=wQ5RzQc9R5o'
    WHEN 'hamstring_foam_roll' THEN 'https://www.youtube.com/watch?v=gPv7d3TMxXY'
    WHEN 'it_band_foam_roll' THEN 'https://www.youtube.com/watch?v=_j4XGS0XEUE'
    WHEN 'glute_foam_roll' THEN 'https://www.youtube.com/watch?v=IxPeT7IXkpU'

    -- Recovery / Cooldown
    WHEN 'childs_pose' THEN 'https://www.youtube.com/watch?v=eqVMAPM00bM'
    WHEN 'supine_twist' THEN 'https://www.youtube.com/watch?v=TnS8bmIeEQw'
    WHEN 'diaphragmatic_breathing' THEN 'https://www.youtube.com/watch?v=kgTL5G1ibIo'
    WHEN 'box_breathing' THEN 'https://www.youtube.com/watch?v=tEmt1Znux58'
    WHEN 'yoga_sun_salutation' THEN 'https://www.youtube.com/watch?v=GYHAMk2X4EM'
    WHEN 'cat_cow_stretch' THEN 'https://www.youtube.com/watch?v=kqnua4rHVVA'
    WHEN 'thread_the_needle' THEN 'https://www.youtube.com/watch?v=5VrHQO6F5DI'
    WHEN 'prone_hip_internal_rotation' THEN 'https://www.youtube.com/watch?v=k-j5kROURNM'
    WHEN 'standing_calf_stretch' THEN 'https://www.youtube.com/watch?v=JWKqRChvGiE'
    WHEN 'seated_piriformis_stretch' THEN 'https://www.youtube.com/watch?v=VQBcKHi1ZG0'
    WHEN 'upper_trap_stretch' THEN 'https://www.youtube.com/watch?v=r2L7hMDyqN0'
    WHEN 'wrist_mobility_circles' THEN 'https://www.youtube.com/watch?v=mSZWSQSSEjE'
    WHEN 'thoracic_extension_chair' THEN 'https://www.youtube.com/watch?v=fRVZNaGFkWI'
    WHEN 'standing_spinal_rotation' THEN 'https://www.youtube.com/watch?v=2m-YxNsWGxU'
    WHEN 'neck_circles' THEN 'https://www.youtube.com/watch?v=XKblJYAkRiI'
END
WHERE slug IN (
    'box_jump', 'depth_jump', 'broad_jump', 'single_leg_box_jump', 'lateral_bounds',
    'hurdle_hops', 'tuck_jump', 'drop_jump', 'pogos', 'lateral_hurdle_hop',
    'jump_squat', 'squat_jump_to_stick', 'skater_jump', 'star_jump',
    'power_clean', 'hang_power_clean', 'power_snatch', 'hang_power_snatch', 'push_press',
    'back_squat', 'front_squat', 'trap_bar_deadlift', 'conventional_deadlift',
    'sumo_deadlift', 'romanian_deadlift', 'stiff_leg_deadlift', 'hip_thrust',
    'bulgarian_split_squat', 'single_leg_rdl', 'step_up', 'reverse_lunge',
    'goblet_squat', 'cossack_squat', 'wall_sit', 'deep_squat_hold',
    'bodyweight_squat', 'pistol_squat', 'assisted_pistol_squat', 'split_squat',
    'walking_lunge', 'lateral_lunge', 'sumo_squat', 'banded_squat',
    'nordic_hamstring_curl', 'single_leg_calf_raise', 'tibialis_raise',
    'reverse_hyperextension', 'back_extension_45deg', 'wall_supported_hamstring_curl',
    'calf_raise_bilateral',
    'glute_bridge', 'single_leg_glute_bridge', 'banded_monster_walk', 'lateral_band_walk',
    'banded_clamshell', 'banded_hip_thrust', 'donkey_kick', 'fire_hydrant',
    'standing_hip_abduction', 'standing_hip_extension', 'banded_kickback',
    'bench_press', 'incline_dumbbell_press', 'overhead_press', 'landmine_press',
    'push_up', 'wide_grip_push_up', 'diamond_push_up', 'decline_push_up',
    'archer_push_up', 'pike_push_up', 'explosive_push_up', 'shoulder_tap_push_up',
    'tricep_dip', 'dumbbell_floor_press', 'banded_overhead_press', 'banded_lateral_raise',
    'banded_chest_press_floor', 'dumbbell_curl_to_press',
    'pull_up', 'chin_up', 'weighted_pull_up', 'barbell_row', 'dumbbell_row',
    'face_pull', 'band_pull_apart', 'scapular_pull_up', 'inverted_row',
    'negative_pull_up', 'renegade_row', 'banded_row', 'banded_face_pull',
    'banded_good_morning', 'banded_romanian_deadlift', 'dumbbell_hip_hinge_row',
    'plank', 'side_plank', 'dead_bug', 'bird_dog', 'ab_wheel_rollout',
    'cable_chop', 'hanging_leg_raise', 'pallof_press', 'copenhagen_plank',
    'copenhagen_hip_adduction', 'hollow_body_hold', 'v_up', 'reverse_crunch',
    'bicycle_crunch', 'superman_hold', 'mountain_climber', 'spiderman_plank',
    'toe_touch_crunch', 'banded_bicycle',
    'farmers_walk', 'suitcase_carry', 'isometric_mid_thigh_pull',
    'sled_push', 'sled_pull', 'resisted_sprint', 'sprint_parachute_run',
    'flying_20_sprint', 'acceleration_sprint_10m', 'prowler_push_sprint',
    'sprint_start_blocks', 'banded_sprint_resistance_run',
    'a_skip_drill', 'b_skip_drill', 'high_knees', 'butt_kicks',
    'wall_drill_march', 'banded_hip_flexor_march',
    'agility_ladder_ickey_shuffle', 'agility_ladder_single_leg_hops',
    'pro_agility_shuttle', 't_drill', 'reactive_drop_catch',
    'medicine_ball_slam', 'rotational_med_ball_throw', 'med_ball_chest_pass',
    'med_ball_overhead_throw', 'med_ball_scoop_toss',
    'dumbbell_thruster', 'dumbbell_snatch', 'dumbbell_clean', 'dumbbell_rdl',
    'dumbbell_lateral_lunge', 'dumbbell_step_up_to_press', 'dumbbell_swing',
    'dumbbell_goblet_reverse_lunge',
    'jump_rope_standard', 'jump_rope_double_under', 'burpee', 'burpee_broad_jump',
    'bear_crawl', 'lateral_shuffle', 'shadow_boxing', 'jumping_jacks',
    'sprint_in_place', 'stair_sprint',
    'worlds_greatest_stretch', 'inchworm', 'hip_cars', 'shoulder_cars', 'ankle_cars',
    'banded_ankle_distraction', 'hip_90_90_stretch', 'hip_flexor_lunge_stretch',
    'pigeon_pose', 'leg_swing_front_to_back', 'leg_swing_side_to_side', 'arm_circle',
    'seated_hamstring_stretch', 'standing_quad_stretch', 'kneeling_adductor_stretch',
    'doorway_chest_stretch', 'deep_squat_hold',
    'thoracic_foam_roll', 'lat_foam_roll', 'quad_foam_roll', 'hamstring_foam_roll',
    'it_band_foam_roll', 'glute_foam_roll',
    'childs_pose', 'supine_twist', 'diaphragmatic_breathing', 'box_breathing',
    'yoga_sun_salutation', 'cat_cow_stretch', 'thread_the_needle',
    'prone_hip_internal_rotation', 'standing_calf_stretch', 'seated_piriformis_stretch',
    'upper_trap_stretch', 'wrist_mobility_circles', 'thoracic_extension_chair',
    'standing_spinal_rotation', 'neck_circles'
);
