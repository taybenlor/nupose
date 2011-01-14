require 'soundcloud'
class ApplicationController < ActionController::Base
  protect_from_forgery
  
  private
  def connected?
    (session[:access_token] && session[:access_token_secret])
  end
  
  def require_not_connected
    return if connected?
  end
  
  def connection
    return @connection if @connection
    return None unless connected?
    access_token = OAuth::AccessToken.new($sc_consumer, session[:access_token], session[:access_token_secret])
    @connection = Soundcloud.register({:access_token => access_token, :site => "http://api.#{$sc_host}"})
  end
end
