import '../css/shared/contact-us.css';
import simbajonImg from '../assets/contact_pics/simbajon.jpg';

import githubIcon from '../assets/contact_socials/github.svg';
import facebookIcon from '../assets/contact_socials/facebook.svg';

export default function ContactUs() {
    return (
        <main className="contact-main-content">
            <div className="contact-main-content-header">
                <h1 id="contact-main-content-title">Contact Us</h1>
            </div>
            <div className="contact-content">
                <p>Contact information will be available here.</p>
                <div className="contact-card-container">

                    <div className="contact-card balbon">
                        {/* <img src={simbajonImg} alt="balbon" className="balbon-png contact-png" /> */}
                        <div className="contact-info">
                            <h3 className="name">Zachary Lance Balbon</h3>
                            <p className="role">Quality Assurance Testing</p>
                            <p className="course">Information Technology - 3</p>
                            <div className="socials">
                                <img src={githubIcon} alt="GitHub" className="github socials-icon" />
                                <img src={facebookIcon} alt="Facebook" className="facebook socials-icon" />
                            </div>
                        </div>
                    </div>
                    <div className="contact-card po">
                        {/* <img src={simbajonImg} alt="po" className="po-png contact-png" /> */}
                        <div className="contact-info">
                            <h3 className="name">Ram Jay Po</h3>
                            <p className="role">Frontend & Backend Developer</p>
                            <p className="course">Information Technology - 3</p>
                            <div className="socials">
                                <img src={githubIcon} alt="GitHub" className="github socials-icon" />
                                <img src={facebookIcon} alt="Facebook" className="facebook socials-icon" />
                            </div>
                        </div>
                    </div>
                    <div className="contact-card simbajon">
                        <img src={simbajonImg} alt="Simbajon" className="simbajon-png contact-png" />
                        <div className="contact-info">
                            <h3 className="name">Evan Daniel Simbajon</h3>
                            <p className="role">Head Developer</p>
                            <p className="course">Information Technology - 3</p>
                            <div className="socials">
                                <img src={githubIcon} alt="GitHub" className="github socials-icon" />
                                <img src={facebookIcon} alt="Facebook" className="facebook socials-icon" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
