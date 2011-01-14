class TracksController < ApplicationController
  
  def index
    sc = connection
    @tracks = sc.User.find_me.tracks
  end
  
  def show
    @id = params[:id]
    access_token = OAuth::AccessToken.new($sc_consumer, session[:access_token], session[:access_token_secret])
    sc = Soundcloud.register({:access_token => access_token, :site => "http://api.#{$sc_host}"})
    @track = sc.Track.find(@id)
  end
end
