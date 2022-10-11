import React from "react";
import { AiTwotoneFire } from "react-icons/ai";
import { IoIosCheckmarkCircle } from "react-icons/io";
import BannerImg from "../Image/Rectangle 59.png";
import { BsDiscord, BsTwitter, BsLinkedin } from "react-icons/bs";

const Banner = () => {
  return (
    <div className="container ">
      <div className="banner mt-40">
        <div className="banner_content">
          <div className="adranaline_box"> 
            <div className="adranaline_box_content">
              <p className="top">
                Spin and Win with your luck <span className="new">New</span>
                <span className="hot">
                  <AiTwotoneFire />
                </span>
              </p>
              <p className="fee">20 items | Random win</p>
              {/* <p>
                5.00<sup> USDC</sup>
              </p> */}
            </div>
          </div>
          <div className="go_back">
            <p>
              <p style={{color: "#45f345",marginRight: "10px", fontSize: "26px"}}>
                <IoIosCheckmarkCircle />
              </p>{" "}
              Audited by experts
            </p>
            <p>
            <a className="icons" href="https://discord.gg/VZKfDphYfu" target={"_blank"}><BsDiscord /></a> {" "}
            <a className="icons" href="https://twitter.com/2xSolution" target={"_blank"}><BsTwitter /></a> {" "}
            <a className="icons" href="https://www.linkedin.com/company/2x-solution" target={"_blank"}><BsLinkedin /></a> {" "}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banner;
