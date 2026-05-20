import '../css/shared/contact-us.css';
import { useState } from 'react';
import Modal from '../components/Modal';
import simbajonImg from '../assets/contact_pics/simbajon.jpg';

import githubIcon from '../assets/contact_socials/github.svg';
import facebookIcon from '../assets/contact_socials/facebook.svg';
import tooltipIcon from '../assets/tooltip.svg';

export default function ContactUs() {
    const [showEmailModal, setShowEmailModal] = useState(false);

    return (
        <main className="contact-main-content">
            <div className="contact-main-content-header">
                <div className="contact-title-with-icon">
                    <h1 id="contact-main-content-title">Contact Us</h1>
                    <div className="contact-tooltip-wrapper">
                        <img src={tooltipIcon} alt="Info" className="contact-tooltip-icon grey-filter" width="20" height="20" />
                        <p className="contact-tooltip">Found issues or problems? Contact any one of us!</p>
                    </div>
                </div>
            </div>
            <div className="contact-content">
                <div className="contact-card-container">
                    <div className="contact-card balbon">
                        {/* <img src={simbajonImg} alt="balbon" className="balbon-png contact-png" /> */}
                        <div className="contact-info">
                            <h3 className="name">Zachary Lance Balbon</h3>
                            <p className="role">Quality Assurance Testing</p>
                            <p className="course">Information Technology - 3</p>
                            <div className="socials">
                                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                                    <img src={githubIcon} alt="GitHub" className="github socials-icon" />
                                </a>
                                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                                    <img src={facebookIcon} alt="Facebook" className="facebook socials-icon" />
                                </a>
                            </div>
                        </div>
                        <div className="contact-bar">
                            <span className="contact-label">Contact</span>
                            <span className="contact-email" onClick={() => setShowEmailModal(true)}>
                                balbon.email@placeholder.com
                            </span>
                        </div>
                    </div>
                    <div className="contact-card po">
                        {/* <img src={simbajonImg} alt="po" className="po-png contact-png" /> */}
                        <div className="contact-info">
                            <h3 className="name">Ram Jay Po</h3>
                            <p className="role">Frontend & Backend Developer</p>
                            <p className="course">Information Technology - 3</p>
                            <div className="socials">
                                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                                    <img src={githubIcon} alt="GitHub" className="github socials-icon" />
                                </a>
                                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                                    <img src={facebookIcon} alt="Facebook" className="facebook socials-icon" />
                                </a>
                            </div>
                        </div>
                        <div className="contact-bar">
                            <span className="contact-label">Contact</span>
                            <span className="contact-email" onClick={() => setShowEmailModal(true)}>
                                po.email@placeholder.com
                            </span>
                        </div>
                    </div>
                    <div className="contact-card simbajon">
                        <img src={simbajonImg} alt="Simbajon" className="simbajon-png contact-png" />
                        <div className="contact-info">
                            <h3 className="name">Evan Daniel Simbajon</h3>
                            <p className="role">Head Developer</p>
                            <p className="course">Information Technology - 3</p>
                            <div className="socials">
                                <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                                    <img src={githubIcon} alt="GitHub" className="github socials-icon" />
                                </a>
                                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                                    <img src={facebookIcon} alt="Facebook" className="facebook socials-icon" />
                                </a>
                            </div>
                        </div>
                        <div className="contact-bar">
                            <span className="contact-label">Contact</span>
                            <span className="contact-email" onClick={() => setShowEmailModal(true)}>
                                simbajon.email@placeholder.com
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <Modal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                title="Contact Email"
                variant="info"
                actions={
                    <button className="modal-btn modal-btn-primary modal-btn-full" onClick={() => setShowEmailModal(false)}>
                        OK
                    </button>
                }
            >
                Email feature coming soon.
            </Modal>
        </main>
    );
}
