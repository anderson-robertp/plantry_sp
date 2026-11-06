import type { CSSProperties } from 'react';

export function Footer() {
    return (
        <footer style={styles.footer}>
            <div style={styles.container}>
                        
        {/* Section 1: Brand / Info */}
        <div style={styles.section}>
          <h3 style={styles.heading}>Company Name</h3>
          <p style={styles.text}>Building excellent web experiences with modern, responsive design.</p>
        </div>

        {/* Section 2: Quick Links */}
        <div style={styles.section}>
          <h4 style={styles.subHeading}>Quick Links</h4>
          <ul style={styles.list}>
            <li><a href="#about" style={styles.link}>About Us</a></li>
            <li><a href="#services" style={styles.link}>Services</a></li>
            <li><a href="#contact" style={styles.link}>Contact</a></li>
          </ul>
        </div>

        {/* Section 3: Newsletter */}
        <div style={styles.section}>
          <h4 style={styles.subHeading}>Stay Updated</h4>
          <form style={styles.form} onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="Enter your email" 
              style={styles.input} 
              required 
              />
            <button type="submit" style={styles.button}>Subscribe</button>
          </form>
        </div>

      </div>

      {/* Bottom Copyright Bar */}
      <div style={styles.bottomBar}>
        <p style={styles.copyText}>
          &copy; {new Date().getFullYear()} Company Name. All rights reserved.
        </p>
            </div>
        </footer>
    )  
}



// Clean, reusable inline styles 
const styles: Record<string, CSSProperties> = {
  footer: {
    backgroundColor: '#1a1a1a',
    color: '#ffffff',
    padding: '40px 20px 20px 20px',
    fontFamily: 'Arial, sans-serif',
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: '30px',
  },
  section: {
    flex: '1 1 250px',
  },
  heading: {
    fontSize: '1.5rem',
    marginBottom: '15px',
    color: '#4dadf7',
  },
  subHeading: {
    fontSize: '1.2rem',
    marginBottom: '15px',
  },
  text: {
    color: '#cccccc',
    lineHeight: '1.6',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  link: {
    color: '#cccccc',
    textDecoration: 'none',
    lineHeight: '2',
    display: 'inline-block',
  },
  form: {
    display: 'flex',
    gap: '10px',
  },
  input: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '4px',
    flex: 1,
  },
  button: {
    padding: '8px 16px',
    backgroundColor: '#4dadf7',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  bottomBar: {
    borderTop: '1px solid #333',
    marginTop: '30px',
    paddingTop: '20px',
    textAlign: 'center',
  },
  copyText: {
    color: '#888888',
    fontSize: '0.9rem',
    margin: 0,
  },
};

export default Footer;