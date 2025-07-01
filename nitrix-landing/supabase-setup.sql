-- Create invite_codes table
CREATE TABLE IF NOT EXISTS invite_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(12) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    used_by_ip VARCHAR(45),
    notes TEXT
);

-- Create download_analytics table
CREATE TABLE IF NOT EXISTS download_analytics (
    id SERIAL PRIMARY KEY,
    platform VARCHAR(20) NOT NULL,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_ip VARCHAR(45),
    user_agent TEXT
);

-- Insert sample invite codes
INSERT INTO invite_codes (code, notes) VALUES 
('NITRIX001234', 'Beta tester code 1'),
('NITRIX005678', 'Beta tester code 2'),
('NITRIX009876', 'Beta tester code 3'),
('NITRIX543210', 'Beta tester code 4'),
('NITRIX111222', 'Beta tester code 5'),
('NITRIX333444', 'Beta tester code 6'),
('NITRIX555666', 'Beta tester code 7'),
('NITRIX777888', 'Beta tester code 8'),
('NITRIX999000', 'Beta tester code 9'),
('NITRIXALPHA1', 'Alpha tester code 1'),
('NITRIXBETA01', 'Beta team access'),
('NITRIXVIP001', 'VIP early access');

-- Enable Row Level Security (optional but recommended)
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed)
CREATE POLICY "Allow public read on invite_codes" ON invite_codes
    FOR SELECT TO anon USING (true);

CREATE POLICY "Allow public update on invite_codes" ON invite_codes
    FOR UPDATE TO anon USING (true);

CREATE POLICY "Allow public insert on download_analytics" ON download_analytics
    FOR INSERT TO anon WITH CHECK (true);

-- Create function to generate random invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(12) AS $$
DECLARE
    chars VARCHAR(36) := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    result VARCHAR(12) := '';
    i INTEGER;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to create batch invite codes
CREATE OR REPLACE FUNCTION create_invite_codes(count INTEGER, note_prefix TEXT DEFAULT 'Batch')
RETURNS TABLE(code VARCHAR(12)) AS $$
DECLARE
    i INTEGER;
    new_code VARCHAR(12);
BEGIN
    FOR i IN 1..count LOOP
        LOOP
            new_code := generate_invite_code();
            BEGIN
                INSERT INTO invite_codes (code, notes) 
                VALUES (new_code, note_prefix || ' code ' || i);
                EXIT;
            EXCEPTION WHEN unique_violation THEN
                -- Try again with a new code
                CONTINUE;
            END;
        END LOOP;
        RETURN NEXT new_code;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Example: Generate 50 additional codes
-- SELECT * FROM create_invite_codes(50, 'Launch batch');