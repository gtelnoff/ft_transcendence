CREATE TABLE TROPHY(
    id SERIAL,
    title VARCHAR(50) NOT NULL,
    description VARCHAR(250) NOT NULL,

    PRIMARY KEY(id),
    CONSTRAINT title_unique UNIQUE(title)
);

CREATE TABLE PLAYER(
	id 					SERIAL,
	id_active_trophy 	INTEGER,
	login				VARCHAR(50) NOT NULL,
	username 			VARCHAR(50) NOT NULL,
	password 			VARCHAR(50) NOT NULL,
	jwt_token			varchar(255),
	avatar_path 		VARCHAR(100),
	last_connection		TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	online				BOOLEAN DEFAULT TRUE,
	classic_elo			INTEGER,
	classic_wins		INTEGER DEFAULT 0,
	classic_losses		INTEGER DEFAULT 0,
	custom_elo			INTEGER,
	custom_wins			INTEGER DEFAULT 0,
	custom_losses		INTEGER DEFAULT 0,
	
	PRIMARY KEY(id),
	CONSTRAINT fk_trophy
		FOREIGN KEY(id_active_trophy)
		REFERENCES TROPHY(id),
	CONSTRAINT login_unique UNIQUE(login),
	CONSTRAINT username_unique UNIQUE(username)
);

CREATE TABLE PLAYER_TROPHY(
	id_user 			INTEGER NOT NULL,
	id_trophy			INTEGER NOT NULL,
	time_acquired		TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	PRIMARY KEY(id_user, id_trophy),
	CONSTRAINT fk_user
		FOREIGN KEY(id_user)
		REFERENCES PLAYER(id),
	CONSTRAINT fk_trophy
		FOREIGN KEY(id_trophy)
		REFERENCES TROPHY(id)
);

CREATE TABLE MATCH(
	id					SERIAL,
	id_player_1			INTEGER NOT NULL,
	id_player_2			INTEGER NOT NULL,
	time_started		TIMESTAMPTZ DEFAULT NOW(),
	time_ended			TIMESTAMPTZ,
	score_p1			INTEGER NOT NULL DEFAULT 0,
	score_p2			INTEGER NOT NULL DEFAULT 0,
	ladder_game			BOOLEAN NOT NULL,
	classic_game		BOOLEAN NOT NULL,

	PRIMARY KEY(id),
	CONSTRAINT fk_p1
		FOREIGN KEY(id_player_1)
		REFERENCES PLAYER(id),
	CONSTRAINT fk_p2
		FOREIGN KEY(id_player_2)
		REFERENCES PLAYER(id)
);

CREATE TABLE FRIENDS(
	id_user				INTEGER NOT NULL,
	id_invited			INTEGER NOT NULL,
	accepted			BOOLEAN DEFAULT FALSE,
	time_accepted		TIMESTAMPTZ,

	PRIMARY_KEY (LEAST(id_user, id_invited), GREATEST(id_user, id_invited)),
	CONSTRAINT fk_user
		FOREIGN KEY(id_user)
		REFERENCES PLAYER(id),
	CONSTRAINT fk_invited
		FOREIGN KEY(id_invited)
		REFERENCES PLAYER(id)
);

CREATE TABLE BLOCKED_PLAYERS(
	id_user				INTEGER NOT NULL,
	id_blocked			INTEGER NOT NULL,
	time_blocked		TIMESTAMPTZ NOT NULL DEFAULT NOW(),

	PRIMARY_KEY (id_user, id_blocked),
	CONSTRAINT fk_user
		FOREIGN KEY(id_user)
		REFERENCES PLAYER(id),
	CONSTRAINT fk_blocked
		FOREIGN KEY(id_blocked)
		REFERENCES PLAYER(id)
);

CREATE TABLE CHANNELS(
	id					SERIAL,
	id_owner			INTEGER NOT NULL,
	password			VARCHAR(50),
	private				BOOLEAN NOT NULL DEFAULT FALSE,
	time_created		TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	time_closed			TIMESTAMPTZ,

	PRIMARY KEY(id),
	CONSTRAINT fk_owner
		FOREIGN KEY(id_owner)
		REFERENCES PLAYER(id)
);

CREATE TABLE CHAN_PLAYER(
	id_chan				INTEGER NOT NULL,
	id_user				INTEGER NOT NULL,
	admin				BOOLEAN NOT NULL DEFAULT FALSE,
	time_muted_until	TIMESTAMPTZ,
	time_banned_until	TIMESTAMPTZ,

	PRIMARY KEY (id_chan, id_user),
	CONSTRAINT fk_channel
		FOREIGN_KEY(id_chan)
		REFERENCES CHANNEL(id),
	CONSTRAINT fk_user
		FOREIGN_KEY(id_user)
		REFERENCES PLAYER(id)
);

CREATE TYPE MESSAGE_TYPE AS ENUM("TEXT", "JOIN", "LEFT", "KICK", "BAN", "MUTE", "INVITE");

CREATE TABLE CHAN_MESSAGES(
	id					SERIAL,
	id_chan				INTEGER NOT NULL,
	id_user				INTEGER NOT NULL,
	id_target			INTEGER,
	time_posted			TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	deleted				BOOLEAN DEFAULT FALSE,
	type				MESSAGE_TYPE NOT NULL,
	content				VARCHAR(255),

	PRIMARY KEY(id),
	CONSTRAINT fk_chan_user
		FOREIGN KEY(id_chan, id_user)
		REFERENCES CHAN_PLAYER(id_chan, id_user),
	CONSTRAINT fk_target
		FOREIGN KEY(id_chan, id_target)
		REFERENCES CHAN_PLAYER(id_chan, id_target)
);
